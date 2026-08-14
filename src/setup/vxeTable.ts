import { VxeLoading } from 'vxe-pc-ui';
import { VxeUI } from 'vxe-table';

const i18nTable: Record<string, string | undefined> = {
  'vxe.table.allFilter': 'All',
  'vxe.table.allTitle': 'All',
  'vxe.table.confirmFilter': 'Apply',
  'vxe.table.resetFilter': 'Reset',
  'vxe.loading.text': 'Loading',
};

VxeUI.setConfig({
  i18n: key => i18nTable[key] ?? (import.meta.env.DEV ? key : ''),
  table: {
    menuConfig: {
      transfer: true,
    },
  },
});

// Table loading overlay is resolved via VxeUI.getComponent('VxeLoading').
VxeUI.component(VxeLoading);
