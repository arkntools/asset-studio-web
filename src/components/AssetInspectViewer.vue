<template>
  <VxeTable
    ref="tableRef"
    class="asset-dump-table"
    cell-class-name="asset-dump-table__cell"
    :row-class-name="({ row }) => ({ 'is-root': !row.parentId })"
    border="none"
    size="mini"
    height="100%"
    :data="dumpRows"
    :show-header="false"
    :column-config="{ resizable: true }"
    :cell-config="{ padding: false }"
    :row-config="{ useKey: true, keyField: 'id', isHover: true }"
    :tree-config="{ transform: true, rowField: 'id', parentField: 'parentId' }"
    :menu-config="menuConfig"
    :virtual-y-config="{ enabled: true, gt: 0 }"
    @cell-click="handleCellClick"
    @menu-click="handleMenu"
  >
    <VxeColumn field="name" tree-node>
      <template #default="{ row }">
        <div class="dump">
          <span class="key" :class="{ ellipsis: !row.parentId }">{{ row.name }}</span>
          <span class="colon">:&nbsp;</span>
          <AutoTitle
            class="value"
            :class="{ [row.type]: true, ellipsis: !!row.parentId }"
            :text="row.valueText"
            :resize-trigger="tableWidth"
          />
          <el-icon
            v-if="row.isPPtr || !row.parentId"
            class="pptr-goto"
            title="Goto asset"
            color="#808080"
            :size="14"
            @click.capture.stop="
              () => {
                const key = !row.parentId ? asset.key : getAssetInfoByPathId(row.value.pathId)?.key;
                if (key) emits('gotoAsset', key);
              }
            "
          >
            <i-el-promotion />
          </el-icon>
        </div>
      </template>
    </VxeColumn>
  </VxeTable>
</template>

<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import { mapValues, omit } from 'es-toolkit';
import { uid } from 'uid';
import { VxeColumn, VxeTable } from 'vxe-table';
import type { VxeTableEvents, VxeTableInstance, VxeTablePropTypes } from 'vxe-table';
import { useAssetManager } from '@/store/assetManager';
import { hasSelection } from '@/utils/common';
import type { AssetInfo } from '@/workers/assetManager';
import AutoTitle from './AutoTitle.vue';

interface DumpRow {
  id: string;
  parentId?: string;
  name: string;
  value: any;
  type: 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function' | 'array';
  valueText: string;
  isPPtr: boolean;
}

defineOptions({
  inheritAttrs: false,
});

const { asset } = defineProps<{
  asset: AssetInfo;
}>();

const emits = defineEmits<{
  (e: 'gotoAsset', key: string): void;
}>();

const { getAssetInfoByPathId } = useAssetManager();

const tableRef = ref<VxeTableInstance<DumpRow>>();
const { width: tableWidth } = useElementSize(tableRef);

const getDumpValueText = (className: string | undefined, type: string, value: any) => {
  if (className) return className;
  switch (type) {
    case 'array':
      return `Array(${value.length})`;
    case 'object':
      return 'Object';
    case 'string':
      return JSON.stringify(value);
  }
  return String(value);
};

const dumpToRows = (rows: DumpRow[], value: any, name: string, parentId?: string): any => {
  if (value === undefined) return;

  const id = uid();
  const type = Array.isArray(value) ? 'array' : typeof value;
  const className: string | undefined = value?.__class;

  const row: DumpRow = markRaw({
    id,
    parentId,
    name,
    value,
    type,
    valueText: getDumpValueText(className, type, value),
    isPPtr: Boolean(className?.startsWith('PPtr') && value?.pathId),
  });
  rows.push(row);

  switch (type) {
    case 'array':
      row.value = (value as any[]).map((item, i) => dumpToRows(rows, item, String(i), id));
      break;
    case 'object':
      row.value = mapValues(className ? omit(value, ['__class']) : value, (v, k) =>
        dumpToRows(rows, v, k as string, id),
      );
      break;
    case 'bigint':
      row.value = String(value);
      break;
  }

  return row.value;
};

const dumpRows = computed(() => {
  const rows: DumpRow[] = [];
  dumpToRows(rows, asset.preview.inspect, asset.name);
  return rows;
});

onMounted(() => {
  watch(
    dumpRows,
    async rows => {
      if (rows.length) {
        await nextTick();
        tableRef.value!.setTreeExpand(rows[0], true);
      }
    },
    { immediate: true },
  );
});

const handleCellClick: VxeTableEvents.CellClick<DumpRow> = ({ $table, row }) => {
  if (hasSelection()) return;
  $table.toggleTreeExpand(row);
};

const menuConfig: VxeTablePropTypes.MenuConfig<DumpRow> = reactive({
  body: {
    options: [
      [
        { code: 'copy', name: 'Copy value', prefixIcon: 'vxe-icon-copy' },
        { code: 'copyJson', name: 'Copy as JSON literal', prefixIcon: 'vxe-icon-copy', visible: false },
        { code: 'copySelection', name: 'Copy selection', prefixIcon: 'vxe-icon-copy', visible: false },
      ],
      [
        { code: 'expandAll', name: 'Expand all', prefixIcon: 'vxe-icon-menu' },
        { code: 'collapseAll', name: 'Collapse all', prefixIcon: 'vxe-icon-minus' },
      ],
    ],
  },
  visibleMethod: ({ options, row }) => {
    if (!row) return false;
    const copy = options[0];
    copy[0].name = `Copy ${row.type}`;
    copy[1].visible = row.type === 'string';
    copy[2].visible = hasSelection();
    return true;
  },
});

const handleMenu: VxeTableEvents.MenuClick<DumpRow> = async ({ $table, menu, row }) => {
  switch (menu.code) {
    case 'copy':
      await navigator.clipboard.writeText(
        typeof row.value === 'object' ? JSON.stringify(row.value, undefined, 2) : String(row.value),
      );
      break;
    case 'copyJson':
      await navigator.clipboard.writeText(row.valueText);
      break;
    case 'copySelection':
      document.execCommand('copy');
      break;
    case 'expandAll':
      await $table.setAllTreeExpand(true);
      break;
    case 'collapseAll':
      await $table.clearTreeExpand();
      await $table.setTreeExpand(dumpRows.value[0], true);
  }
};
</script>

<style lang="scss" scoped>
.asset-dump-table {
  --vxe-ui-table-row-height-mini: 22px;
  user-select: text;

  :deep(.asset-dump-table__cell) {
    padding: 0 !important;
    font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

    .vxe-cell {
      padding: 0 !important;
    }
  }
}

.dump {
  display: flex;
  align-items: center;
  white-space: nowrap;

  .pptr-goto {
    margin-left: 4px;
    padding: 4px;
    box-sizing: content-box;
    cursor: pointer;
  }

  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .key {
    color: #881391;
  }
  .boolean {
    color: #1c00cf;
  }
  .null,
  .undefined {
    color: #808080;
  }
  .bigint,
  .number {
    color: #1c00cf;
  }
  .string {
    color: #c41a16;
  }
  .colon,
  .object,
  .array {
    color: #000;
  }
}
</style>
