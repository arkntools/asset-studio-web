<template>
  <div class="asset-list-table-wrapper">
    <div class="asset-list-table-header">
      <el-input v-model="searchInput" placeholder="Search" :prefix-icon="IElSearch" clearable />
    </div>
    <div class="asset-list-table-main" @dragover.capture.prevent @drop.capture.prevent="handleDropFiles">
      <vxe-table
        id="asset-list-table"
        ref="tableRef"
        class="asset-list-table"
        :data="searchedAssetInfos"
        :loading="store.isLoading"
        :border="true"
        size="mini"
        height="100%"
        header-cell-class-name="cursor-pointer"
        :row-class-name="
          ({ row }) => ({
            highlight: row.key === highlightRowKey,
            // fix highlight current row bug
            'row--current': row.key === store.curAssetInfo?.key,
          })
        "
        :row-config="{
          useKey: true,
          keyField: 'key',
          isCurrent: true,
          isHover: true,
        }"
        :column-config="{ resizable: true }"
        :menu-config="menuConfig"
        :keyboard-config="{ isArrow: true }"
        :checkbox-config="
          isMultiSelect ? { trigger: 'row', highlight: true, range: true, isShiftKey: true } : undefined
        "
        :custom-config="{ storage: { visible: true, resizable: true } }"
        :scroll-y="{ enabled: true }"
        show-overflow="title"
        show-header-overflow
        @menu-click="handleMenu"
        @header-cell-menu="handleHeaderCellMenu"
        @cell-menu="handleCellMenu"
        @cell-click="handleCellClick"
        @current-change="handleCurrentChange"
        @header-cell-click="handleHeaderCellClick"
        @checkbox-range-end="updateMultiSelectNum"
        @checkbox-all="updateMultiSelectNum"
      >
        <vxe-column
          v-if="isMultiSelect"
          type="checkbox"
          :width="38"
          :resizable="false"
          fixed="left"
          header-class-name="cell-overflow-visible"
          class-name="cell-overflow-visible"
        />
        <vxe-column field="name" title="Name" fixed="left" :min-width="120" sortable :sort-by="sortNameMethod" />
        <vxe-column field="container" title="Container" :min-width="60" sortable />
        <vxe-column field="type" title="Type" :width="110" sortable :filters="typeFilterOptions" />
        <vxe-column field="pathId" title="PathID" :min-width="60" />
        <vxe-column field="size" title="Size" align="right" header-align="left" :width="80" sortable>
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </vxe-column>
        <template #empty>
          <el-text :style="{ fontSize: '30px', color: 'var(--el-color-info-light-3)' }">
            {{ filteredAssetInfos.length ? 'No data' : 'Drop files here or click "File" menu to load files' }}
          </el-text>
        </template>
      </vxe-table>
    </div>
    <div v-if="isMultiSelect" class="asset-list-table-footer wrap">
      <div class="footer-block desc">
        {{ multiSelectNum }} asset{{ multiSelectNum > 1 ? 's' : '' }} selected{{
          multiSelectCannotExportNum > 0 ? `, ${multiSelectCannotExportNum} can't be exported` : ''
        }}.
      </div>
      <div class="footer-block actions">
        <el-button
          type="primary"
          size="small"
          :disabled="store.isBatchExporting || multiSelectNum === multiSelectCannotExportNum"
          @click="handleBatchExportSelected"
          >Export selected</el-button
        >
        <el-button type="primary" size="small" @click="handleCancelMultiSelect">Cancel</el-button>
      </div>
    </div>
    <div v-if="store.isLoading || store.isBatchExporting" class="asset-list-table-footer">
      <ProgressBar />
    </div>
  </div>
</template>

<script setup lang="ts">
import IElSearch from '~icons/ep/search';
import type { VxeColumnPropTypes, VxeTableEvents, VxeTableInstance, VxeTablePropTypes } from 'vxe-table';
import { IS_MAC } from '@/const';
import { useNatsort } from '@/hooks/useNatsort';
import { useRefDebouncedConditional } from '@/hooks/useRef';
import { useAssetManager } from '@/store/assetManager';
import { useSetting } from '@/store/setting';
import { sleep } from '@/utils/common';
import { getFilesFromDataTransferItems } from '@/utils/file';
import { formatSize } from '@/utils/formater';
import { showNotingCanBeExportToast } from '@/utils/toasts';
import { getMenuHeaderConfig, getVxeTableCommonTools, handleCommonMenu } from '@/utils/vxeTableCommon';
import type { AssetInfo } from '@/workers/assetManager';
import ProgressBar from './components/ProgressBar.vue';

const tableRef = ref<VxeTableInstance<AssetInfo>>();

const store = useAssetManager();
const setting = useSetting();

watch(
  () => store.curAssetInfo,
  info => {
    if (!info) tableRef.value?.clearCurrentRow();
  },
);

const handleDropFiles = async (e: DragEvent) => {
  if (store.isLoading) return;
  const items = [...(e.dataTransfer?.items ?? [])];
  const files = await getFilesFromDataTransferItems(items);
  if (files.length) store.loadFiles(files);
};

const filteredAssetInfos = computed(() =>
  setting.data.hideNamelessAssets ? store.assetInfos.filter(({ name }) => name) : store.assetInfos,
);

const { source: searchInput, result: searchInputDebounced } = useRefDebouncedConditional({
  initValue: '',
  delay: 200,
  condition: v => !!v,
});
const searchedAssetInfos = computed(() => {
  const searchText = searchInputDebounced.value.toLowerCase();
  if (!searchText) return filteredAssetInfos.value;
  return filteredAssetInfos.value.filter(({ search }) => search.includes(searchText));
});

const getAssetNameSortIndex = useNatsort(() => store.assetInfos.map(({ name }) => name));
const sortNameMethod: VxeColumnPropTypes.SortBy<AssetInfo> = ({ row }) => getAssetNameSortIndex(row.name);

const isMultiSelect = ref(false);
const multiSelectRows = shallowRef<AssetInfo[]>([]);
const multiSelectNum = computed(() => multiSelectRows.value.length);
const multiSelectCannotExportNum = computed(() => multiSelectRows.value.filter(row => !store.canExport(row)).length);

let lastAssetInfo: AssetInfo | undefined;

const updateMultiSelectNum = () => {
  multiSelectRows.value = tableRef.value!.getCheckboxRecords();
};

const handleCellClick: VxeTableEvents.CellClick<AssetInfo> = async ({ row, $event }) => {
  const { ctrlKey, shiftKey, metaKey } = $event as MouseEvent;
  const modKey = IS_MAC ? metaKey : ctrlKey;
  const $table = tableRef.value!;
  let lastRowIndex: number;
  if (
    (modKey || shiftKey) &&
    !isMultiSelect.value &&
    lastAssetInfo &&
    (lastRowIndex = $table.getVTRowIndex(lastAssetInfo)) >= 0
  ) {
    const rowIndex = $table.getVTRowIndex(row);
    isMultiSelect.value = true;
    if (shiftKey) {
      const { visibleData } = $table.getTableData();
      await $table.setCheckboxRow(
        visibleData.slice(Math.min(lastRowIndex, rowIndex), Math.max(lastRowIndex, rowIndex) + 1),
        true,
      );
    } else if (modKey) {
      await $table.setCheckboxRow([lastAssetInfo, row], true);
    }
  }
  if (isMultiSelect.value) updateMultiSelectNum();
};

const handleCancelMultiSelect = () => {
  tableRef.value?.clearCheckboxRow();
  isMultiSelect.value = false;
  multiSelectRows.value = [];
};

const setCurrentRow = (row: AssetInfo) => {
  if (!tableRef.value) return;
  lastAssetInfo = store.curAssetInfo;
  tableRef.value.setCurrentRow(row);
  store.setCurAssetInfo(row);
};

const typeFilterOptions = computed(() =>
  [...new Set(filteredAssetInfos.value.map(({ type }) => type)).values()]
    .sort()
    .map(value => ({ label: value, value })),
);

const { handleHeaderCellClick, menuConfigVisibleMethodProcessHeader } = getVxeTableCommonTools(tableRef);

const menuConfig: VxeTablePropTypes.MenuConfig<AssetInfo> = reactive({
  header: getMenuHeaderConfig(),
  body: {
    options: [
      [
        { code: 'copy', name: 'Copy text', prefixIcon: 'vxe-icon-copy' },
        { code: 'export', name: 'Export select asset', prefixIcon: 'vxe-icon-save', disabled: false },
      ],
      [{ code: 'multiselect', name: 'Multi select', prefixIcon: 'vxe-icon-square-checked' }],
    ],
  },
  visibleMethod: params => {
    const { type, options, column, row } = params;
    if (type !== 'header') {
      if (isMultiSelect.value || !row) return false;
      options[0][1].disabled = !store.canExport(row);
      return true;
    }
    if (column?.type === 'checkbox') return false;
    menuConfigVisibleMethodProcessHeader(params);
    return true;
  },
});

const handleMenu: VxeTableEvents.MenuClick<AssetInfo> = async params => {
  const { menu, row, $table } = params;
  switch (menu.code) {
    case 'export':
      await store.exportAsset(row);
      break;
    case 'multiselect':
      isMultiSelect.value = true;
      await $table.setCheckboxRow(row, true);
      updateMultiSelectNum();
      break;
    default:
      handleCommonMenu(params);
      break;
  }
};

const handleHeaderCellMenu: VxeTableEvents.HeaderCellMenu<AssetInfo> = ({ column, $event }) => {
  if (column.type === 'checkbox') $event.preventDefault();
};

const handleCellMenu: VxeTableEvents.CellMenu<AssetInfo> = ({ row, $event }) => {
  if (isMultiSelect.value) {
    $event.preventDefault();
    return;
  }
  setCurrentRow(row);
};

const handleCurrentChange: VxeTableEvents.CurrentChange<AssetInfo> = ({ row }) => {
  lastAssetInfo = store.curAssetInfo;
  store.setCurAssetInfo(row);
};

const handleBatchExportSelected = () => {
  if (!tableRef.value || store.isBatchExporting || !isMultiSelect.value) return false;
  const canExportRows = multiSelectRows.value.filter(store.canExport);
  if (!canExportRows.length) {
    showNotingCanBeExportToast();
    return true;
  }
  store.batchExportAsset(canExportRows);
  handleCancelMultiSelect();
  return true;
};

const highlightRowKey = ref('');
let highlightTimer: NodeJS.Timeout | null = null;

const gotoAsset = async (pathId: bigint) => {
  const $table = tableRef.value;
  if (!$table) return;

  const info = store.assetInfos.find(i => i.pathId === pathId);
  if (!info) {
    ElMessage({
      message: `Unable to find asset with pathId ${pathId}`,
      type: 'error',
      grouping: true,
    });
    return;
  }

  if ($table.isActiveFilterByColumn(null)) await $table.clearFilter();
  if (searchInput.value) {
    searchInput.value = '';
    await sleep();
    await sleep();
  }
  $table.scrollToRow(info);

  if (highlightTimer) clearTimeout(highlightTimer);
  if (highlightRowKey.value === info.key) {
    highlightRowKey.value = '';
    await sleep();
  }
  highlightRowKey.value = info.key;
  highlightTimer = setTimeout(() => {
    highlightTimer = null;
  }, 1.5e3);
};

const doExport = (type: string) => {
  switch (type) {
    case 'all':
      if (store.assetInfos.length) {
        store.exportAllAssets();
        return;
      }
      break;
    case 'selected':
      if (handleBatchExportSelected()) return;
      if (store.curAssetInfo) {
        store.exportAsset(store.curAssetInfo);
        return;
      }
      break;
    case 'filtered': {
      const { visibleData } = tableRef.value?.getTableData() || {};
      const canExportRows = visibleData?.filter(store.canExport);
      if (canExportRows?.length) {
        store.batchExportAsset(canExportRows);
        return;
      }
      break;
    }
  }
  showNotingCanBeExportToast();
};

if (import.meta.env.DEV) {
  const name = import.meta.env.VITE_AUTO_LOAD_AB;
  if (name) {
    onMounted(async () => {
      const r = await fetch(`/ab/${name}`);
      const data = await r.arrayBuffer();
      const file = new File([data], name);
      await store.loadFiles([file]);
    });
  }
  onBeforeUnmount(() => {
    store.clearFiles();
  });
}

defineExpose({
  gotoAsset,
  doExport,
});
</script>

<style lang="scss" scoped>
.asset-list-table {
  :deep(.highlight) {
    animation: highlight-animation 1.5s;

    @keyframes highlight-animation {
      0%,
      33%,
      66%,
      100% {
        background-color: transparent;
      }
      16%,
      49%,
      82% {
        background-color: var(--el-color-warning-light-3);
      }
    }
  }

  &-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  &-main {
    flex-grow: 1;
    flex-shrink: 1;
    min-height: 0;
    overflow: visible;
    z-index: 0;
  }

  &-header {
    --el-border-radius-base: 0;
    flex-shrink: 0;
    margin-bottom: -1px;
    z-index: 10;
  }

  &-footer {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    padding: 8px 16px;
    font-size: 14px;
    background-color: var(--el-color-info-light-9);

    &.wrap {
      flex-wrap: wrap;
    }

    .footer-block {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      line-height: 24px;
    }

    .desc {
      white-space: nowrap;
    }

    .actions {
      margin-left: auto;
    }
  }
}
</style>
