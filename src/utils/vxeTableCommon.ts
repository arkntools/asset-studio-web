import type { VxeTableEvents, VxeTableInstance, VxeTablePropTypes } from 'vxe-table';
import { getKeysFromEvent } from './common';

type VisibleMethodParam = Parameters<NonNullable<VxeTablePropTypes.MenuConfig<any>['visibleMethod']>>[0];

const switchColumnSort = ($table: VxeTableInstance, field: string) => {
  const [cur] = $table.getSortColumns();
  if (!cur || cur.field !== field) {
    $table.sort(field, 'asc');
  } else if (cur.order === 'asc') {
    $table.sort(field, 'desc');
  } else {
    $table.clearSort(field);
  }
};

export const getVxeTableCommonTools = (table: Ref<VxeTableInstance | null | undefined>) => {
  const handleHeaderCellClick: VxeTableEvents.HeaderCellClick = ({ column, $event: { target } }) => {
    if ((target as HTMLElement)?.tagName === 'I') return;
    if (!table.value) return;
    switchColumnSort(table.value, column.field);
  };

  const menuConfigVisibleMethodProcessHeader = ({ options, columns, column }: VisibleMethodParam) => {
    if (!table.value) return;
    const sortOption = options[1];
    if (column?.sortable) {
      const [cur] = table.value.getSortColumns();
      if (!cur || cur.field !== column.field) {
        sortOption[0].disabled = false;
        sortOption[1].disabled = false;
        sortOption[2].disabled = !cur;
      } else if (cur.order === 'asc') {
        sortOption[0].disabled = true;
        sortOption[1].disabled = false;
        sortOption[2].disabled = false;
      } else {
        sortOption[0].disabled = false;
        sortOption[1].disabled = true;
        sortOption[2].disabled = false;
      }
      sortOption.forEach(item => {
        item.visible = true;
      });
      const isNumber = typeof table.value.getTableData().fullData[0]?.[column.field] === 'number';
      sortOption[0].prefixIcon = isNumber ? 'vxe-icon-sort-numeric-asc' : 'vxe-icon-sort-alpha-asc';
      sortOption[1].prefixIcon = isNumber ? 'vxe-icon-sort-numeric-desc' : 'vxe-icon-sort-alpha-desc';
    } else {
      sortOption.forEach(item => {
        item.visible = false;
      });
    }
    options[0][0].disabled = columns.length <= 1;
    options[2][1].disabled = columns.length >= table.value.getTableColumn().fullColumn.length;
  };

  return {
    handleHeaderCellClick,
    menuConfigVisibleMethodProcessHeader,
  };
};

export const getMenuHeaderConfig = (): VxeTablePropTypes.MenuConfig['header'] => ({
  options: [
    [{ code: 'hideColumn', name: 'Hide this column', prefixIcon: 'vxe-icon-eye-fill-close', disabled: false }],
    [
      { code: 'sortAsc', name: 'Sort asc', prefixIcon: '', visible: true, disabled: false },
      { code: 'sortDesc', name: 'Sort ↓ desc', prefixIcon: '', visible: true, disabled: false },
      { code: 'clearSort', name: 'Clear sort', visible: true, disabled: false },
    ],
    [
      { code: 'resetResizable', name: 'Reset all widths', prefixIcon: 'vxe-icon-ellipsis-h' },
      { code: 'resetVisible', name: 'Reset all visibility', prefixIcon: 'vxe-icon-eye-fill', disabled: false },
    ],
  ],
});

export const handleCommonMenu: VxeTableEvents.MenuClick = async ({ $table, menu, row, column }) => {
  switch (menu.code) {
    case 'copy':
      await navigator.clipboard.writeText(String(row[column.field]));
      break;
    case 'hideColumn':
      await $table.hideColumn(column);
      break;
    case 'sortAsc':
      await $table.sort(column.field, 'asc');
      break;
    case 'sortDesc':
      await $table.sort(column.field, 'desc');
      break;
    case 'clearSort':
      await $table.clearSort(column.field);
      break;
    case 'resetResizable':
      await $table.resetCustom({ resizable: true, visible: false });
      break;
    case 'resetVisible':
      await $table.resetCustom({ resizable: false, visible: true });
      break;
  }
};

export const getKeyDownHandler =
  ({ onCheckAll }: { onCheckAll?: () => void } = {}): VxeTableEvents.Keydown =>
  ({ $event, $table }) => {
    const { modKey, key } = getKeysFromEvent($event);
    if (modKey && key === 'a' && $table.getData().length) {
      $event.preventDefault();
      $table.setAllCheckboxRow(true);
      onCheckAll?.();
    }
  };
