<template>
  <div class="menu-bar">
    <MenuBar :config="menuConfig">
      <template #right>
        <el-button class="github-btn" :icon="IconGithub" circle text @click="gotoGithub" />
      </template>
    </MenuBar>
    <ExportOptionsDialog ref="exportOptionsDialogRef" />
    <UnityCNOptionsDialog ref="unityCNOptionsDialogRef" />
    <AddRepoSourceDialog ref="addRepoSourceDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { BundleEnv } from '@arkntools/unity-js';
import { useFileDialog } from '@vueuse/core';
import IElSelect from '~icons/ep/select';
import IconGithub from '@/assets/github.svg';
import AddRepoSourceDialog from '@/components/AddRepoSourceDialog.vue';
import MenuBar from '@/components/MenuBar.vue';
import type { MenuBarConfig } from '@/components/MenuBar.vue';
import type { MenuDropdownConfigItem } from '@/components/MenuDropdown.vue';
import { useRepoMenuItems } from '@/hooks/useRepoMenuItems';
import { useAssetManager } from '@/store/assetManager';
import { useSetting } from '@/store/setting';
import { openUrl } from '@/utils/common';
import ExportOptionsDialog from './components/ExportOptionsDialog.vue';
import UnityCNOptionsDialog from './components/UnityCNOptionsDialog.vue';

const emits = defineEmits<{
  (name: 'commandExport', type: string): any;
}>();

const assetManager = useAssetManager();
const setting = useSetting();

const exportOptionsDialogRef = useTemplateRef('exportOptionsDialogRef');
const unityCNOptionsDialogRef = useTemplateRef('unityCNOptionsDialogRef');
const addRepoSourceDialogRef = useTemplateRef('addRepoSourceDialogRef');

const gotoGithub = () => {
  openUrl('https://github.com/arkntools/asset-studio-web');
};

const loadFiles = (list: FileList | null) => {
  if (!list || !list.length) return;
  assetManager.loadFiles([...list]);
};

const { open: openFile, onChange: onFileChange } = useFileDialog({ reset: true });
onFileChange(loadFiles);

const { open: openFolder, onChange: onFolderChange } = useFileDialog({ directory: true, reset: true });
onFolderChange(loadFiles);

const getEnvMenuItem = (
  name: string,
  value: (typeof setting.data)['unityEnv'],
  divided?: boolean,
): MenuDropdownConfigItem => ({
  name,
  divided,
  handler: () => {
    setting.data.unityEnv = value;
  },
  icon: () => (setting.data.unityEnv === value ? IElSelect : undefined),
});

const { repoMenuItems, handleRepoMenuClose } = useRepoMenuItems({ dialogRef: addRepoSourceDialogRef as any });

const menuConfig = markRaw<MenuBarConfig>([
  {
    name: 'File',
    items: [
      {
        name: 'Load file',
        handler: openFile,
        disabled: () => assetManager.isLoading,
      },
      {
        name: 'Load folder',
        handler: openFolder,
        disabled: () => assetManager.isLoading,
      },
    ],
  },
  {
    name: 'Options',
    icon: true,
    items: [
      {
        name: 'Enable preview',
        handler: () => {
          setting.data.enablePreview = !setting.data.enablePreview;
        },
        icon: () => (setting.data.enablePreview ? IElSelect : undefined),
      },
      {
        name: 'Hide nameless assets',
        handler: () => {
          setting.data.hideNamelessAssets = !setting.data.hideNamelessAssets;
        },
        icon: () => (setting.data.hideNamelessAssets ? IElSelect : undefined),
      },
      {
        name: 'Export options',
        divided: true,
        disabled: () => assetManager.isBatchExporting,
        handler: () => {
          exportOptionsDialogRef.value?.open();
        },
      },
      {
        name: 'UnityCN options',
        disabled: () => assetManager.isLoading,
        handler: () => {
          unityCNOptionsDialogRef.value?.open();
        },
      },
    ],
  },
  {
    name: 'Env',
    icon: true,
    items: [getEnvMenuItem('None', BundleEnv.NONE), getEnvMenuItem('Arknights', BundleEnv.ARKNIGHTS, true)],
  },
  {
    name: 'Export',
    items: [
      {
        name: 'All assets',
        handler: () => emits('commandExport', 'all'),
        disabled: () => !assetManager.assetInfos.length,
      },
      {
        name: 'Filtered assets',
        handler: () => emits('commandExport', 'filtered'),
        disabled: () => !assetManager.assetInfos.length,
      },
      {
        name: 'Selected assets',
        handler: () => emits('commandExport', 'selected'),
        disabled: () => !(assetManager.assetInfos.length && assetManager.curAssetInfo),
      },
    ],
  },
  {
    name: 'Repository',
    icon: true,
    items: repoMenuItems,
    onClose: handleRepoMenuClose,
  },
]);
</script>

<style lang="scss" scoped>
.menu-btn {
  border: none;
  border-radius: 0;
  outline: none;
}

.github-btn {
  --el-fill-color-light: rgba(0, 0, 0, 0.1);
  --el-fill-color: rgba(0, 0, 0, 0.15);
  padding: 4px;
  font-size: 18px;
}
</style>
