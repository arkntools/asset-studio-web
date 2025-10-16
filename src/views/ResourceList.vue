<template>
  <div class="resource-list">
    <div class="resource-list-header">
      <SearchInput ref="searchInputRef" />
      <el-select
        v-model="repoManager.repoId"
        :class="{ 'repo-select-loading': !repoListOptions.length }"
        :options="repoListOptions"
        :loading="!repoListOptions.length"
        :show-arrow="false"
        :offset="0"
        :fallback-placements="[]"
        placeholder="Select repository"
        style="margin-top: -1px"
      />
    </div>
    <div class="resource-list-main">
      <vxe-table
        id="resource-list-table"
        ref="tableRef"
        class="resource-list-table"
        :data="searchedResList"
        :loading="repoManager.isLoading"
        :border="true"
        size="mini"
        height="100%"
        header-cell-class-name="cursor-pointer"
        :row-config="{
          useKey: true,
          keyField: 'id',
          isHover: true,
        }"
        :column-config="{ resizable: true }"
        :keyboard-config="{ isArrow: true }"
        :checkbox-config="{ trigger: 'row', highlight: true }"
        :custom-config="{ storage: { visible: true, resizable: true } }"
        :menu-config="menuConfig"
        :scroll-y="{ enabled: true }"
        show-overflow="title"
        show-header-overflow
        @header-cell-click="handleHeaderCellClick"
        @menu-click="handleMenu"
        @cell-click="handleCellClick"
        @cell-menu="handleCellMenu"
        @cell-dblclick="handleCellDblclick"
      >
        <vxe-column field="name" title="Name" fixed="left" sortable :sort-by="sortNameMethod">
          <template #default="{ row }">
            <div class="resource-list-table__cell-name">
              <div class="res-name">{{ row.name }}</div>
              <ResourceFetchProgress :value="repoManager.resProgressMap.get(row.id)" />
            </div>
          </template>
        </vxe-column>
        <vxe-column field="size" title="Size" align="right" :width="80" sortable>
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </vxe-column>
        <vxe-column field="abSize" title="AB Size" align="right" :width="80" sortable>
          <template #default="{ row }">
            {{ formatSize(row.abSize) }}
          </template>
        </vxe-column>
        <template #empty>
          <el-empty description="No data" />
        </template>
      </vxe-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResourceItem } from '@arkntools/as-web-repo';
import { FsaError, FsaErrorCode, FsaPromises } from '@tsuk1ko/fsa-promises';
import { saveAs } from 'file-saver';
import type { VxeColumnPropTypes, VxeTableEvents, VxeTableInstance, VxeTablePropTypes } from 'vxe-table';
import ResourceFetchProgress from '@/components/ResourceFetchProgress.vue';
import SearchInput from '@/components/SearchInput.vue';
import { useLastValue } from '@/hooks/useLastValue';
import { useNatsort } from '@/hooks/useNatsort';
import { useAssetManager } from '@/store/assetManager';
import { useRepository } from '@/store/repository';
import { getKeysFromMouseEvent } from '@/utils/common';
import { getLegalFileName } from '@/utils/file';
import { formatSize } from '@/utils/formater';
import { showBatchFilesResultMessage } from '@/utils/toasts';
import type { BatchFilesResult } from '@/utils/toasts';
import { getMenuHeaderConfig, getVxeTableCommonTools, handleCommonMenu } from '@/utils/vxeTableCommon';

const tableRef = ref<VxeTableInstance<ResourceItem>>();
const { handleHeaderCellClick, menuConfigVisibleMethodProcessHeader } = getVxeTableCommonTools(tableRef);

const assetManager = useAssetManager();
const repoManager = useRepository();

const searchInputRef = useTemplateRef('searchInputRef');

const searchedResList = computed(
  () => searchInputRef.value?.doSearch(repoManager.resList, ({ name }) => name) || repoManager.resList,
);

const getResNameSortIndex = useNatsort(() => repoManager.resList.map(({ name }) => name));
const sortNameMethod: VxeColumnPropTypes.SortBy<ResourceItem> = ({ row }) => getResNameSortIndex(row.name);

const menuConfig: VxeTablePropTypes.MenuConfig<ResourceItem> = reactive({
  header: getMenuHeaderConfig(),
  body: {
    options: [
      [
        { code: 'copy', name: 'Copy text', prefixIcon: 'vxe-icon-copy' },
        { code: 'loadRes', name: 'Load resource', prefixIcon: 'vxe-icon-file-zip' },
        { code: 'download', name: 'Download', prefixIcon: 'vxe-icon-download' },
      ],
    ],
  },
  visibleMethod: params => {
    if (params.type === 'header') {
      menuConfigVisibleMethodProcessHeader(params);
    }
    return true;
  },
});

const handleMenu: VxeTableEvents.MenuClick<ResourceItem> = async params => {
  const { $table, menu, column } = params;
  const rows = await $table.getCheckboxRecords();
  switch (menu.code) {
    case 'download':
      downloadRes(rows);
      break;
    case 'loadRes':
      loadRes(rows);
      break;
    case 'copy':
      if (rows.length > 1) {
        await navigator.clipboard.writeText(rows.map(row => String((row as any)[column.field])).join('\n'));
        break;
      }
    // eslint-disable-next-line no-fallthrough
    default:
      handleCommonMenu(params);
      break;
  }
};

const curActiveRow = shallowRef<ResourceItem>();
const lastActiveRow = useLastValue(curActiveRow);

watch(
  () => repoManager.resList,
  () => {
    curActiveRow.value = undefined;
    lastActiveRow.value = undefined;
    tableRef.value?.clearCheckboxRow();
  },
);

const handleCellClick: VxeTableEvents.CellClick<ResourceItem> = async ({ row, $event, $table, $rowIndex }) => {
  curActiveRow.value = row;
  const { modKey, shiftKey } = getKeysFromMouseEvent($event);
  if (modKey) return;

  if (shiftKey) {
    let lastRowIndex: number;
    if (lastActiveRow.value && (lastRowIndex = $table.getVTRowIndex(lastActiveRow.value)) >= 0) {
      const { visibleData } = $table.getTableData();
      await $table.clearCheckboxRow();
      await $table.setCheckboxRow(
        visibleData.slice(Math.min(lastRowIndex, $rowIndex), Math.max(lastRowIndex, $rowIndex) + 1),
        true,
      );
      return;
    }
  }

  await $table.clearCheckboxRow();
  await $table.setCheckboxRow(row, true);
};

const handleCellMenu: VxeTableEvents.CellMenu<ResourceItem> = async ({ row, $event, $table }) => {
  const { modKey, shiftKey } = getKeysFromMouseEvent($event);
  if (modKey || shiftKey || $table.isCheckedByCheckboxRow(row)) return;
  await $table.clearCheckboxRow();
  await $table.setCheckboxRow(row, true);
};

const handleCellDblclick: VxeTableEvents.CellDblclick<ResourceItem> = async ({ row, $table }) => {
  loadRes([row]);
  await $table.clearCheckboxRow();
  await $table.setCheckboxRow(row, true);
};

const pickDownloadDir = () =>
  window.showDirectoryPicker({ id: 'download-resources', mode: 'readwrite' }).catch(console.error);

const downloadRes = async (rows: ResourceItem[]) => {
  if (!rows.length) return;

  if (rows.length === 1) {
    const row = rows[0];
    const res = await repoManager.getResource({ item: row });
    if (!res) return;
    saveAs(res, getLegalFileName(row.name));
    return;
  }

  const handle = await pickDownloadDir();
  if (!handle) return;
  const fs = new FsaPromises({ root: handle, cacheDirHandle: true });
  const result: Required<BatchFilesResult> = {
    success: 0,
    skip: 0,
    error: 0,
  };
  await repoManager.getResources({
    items: rows,
    onSuccess: async file => {
      try {
        await fs.writeFile(getLegalFileName(file.name), file, { flag: 'wx' });
        result.success++;
      } catch (e) {
        if (e instanceof FsaError && e.code === FsaErrorCode.EEXIST) {
          result.skip++;
          return;
        }
        result.error++;
        throw e;
      }
    },
  });
  showBatchFilesResultMessage('Downloaded', result);
};

const loadRes = async (rows: ResourceItem[]) => {
  const files = await repoManager.getResources({ items: rows });
  if (!files?.length) return;
  await assetManager.loadFiles(files);
};

const repoListOptions = computed(() =>
  repoManager.repoList.map(repo => ({
    label: repo.name,
    value: repo.id,
  })),
);
</script>

<style lang="scss" scoped>
.resource-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  &-main {
    flex-grow: 1;
    flex-shrink: 1;
    min-height: 0;
    overflow: visible;
    z-index: 0;
  }

  &-header {
    flex-shrink: 0;
    margin-bottom: -1px;
    z-index: 10;

    :deep(.el-input__wrapper) {
      z-index: 1;
      &:hover {
        z-index: 10;
      }
      &.is-focus {
        z-index: 100;
      }
    }

    :deep(.el-select__wrapper) {
      --el-border-radius-base: 0;
      &:hover {
        z-index: 10;
      }
      &.is-focused {
        z-index: 100;
      }
    }
  }
}

.resource-list-table {
  --vxe-table-row-checkbox-checked-background-color: var(--vxe-table-row-current-background-color);
  --vxe-table-row-hover-checkbox-checked-background-color: var(--vxe-table-row-hover-current-background-color);
}

.resource-list-table__cell-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.res-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-select-loading {
  :deep(.el-select__placeholder) {
    opacity: 0;
  }
}
</style>
