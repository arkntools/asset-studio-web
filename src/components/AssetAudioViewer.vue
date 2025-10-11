<template>
  <div class="asset-audio-viewer">
    <audio
      :src="data || ''"
      class="audio"
      controls
      :autoPlay="settings.autoPlay ? '' : null"
      :loop="settings.loop"
    ></audio>
    <div class="settings">
      <el-switch v-model="settings.autoPlay" class="setting-switch" active-text="Auto Play" />
      <el-switch v-model="settings.loop" class="setting-switch" active-text="Loop" />
    </div>
    <DownloadButton @click="handleExport" />
    <FullSizeLoading :loading="!data" />
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import { useAssetManager } from '@/store/assetManager';
import type { AssetInfo } from '@/workers/assetManager';
import DownloadButton from './DownloadButton.vue';
import FullSizeLoading from './FullSizeLoading.vue';

const { asset } = defineProps<{
  asset: AssetInfo;
  data: string | null;
}>();

const assetManager = useAssetManager();

const settings = useLocalStorage(
  'asset-audio-viewer-settings',
  { autoPlay: false, loop: false },
  { mergeDefaults: true, writeDefaults: false },
);

const handleExport = () => {
  assetManager.exportAsset(asset);
};
</script>

<style lang="scss" scoped>
.asset-audio-viewer {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #aaa;
}

.audio {
  width: 80%;
}

.settings {
  position: absolute;
  top: 8px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-switch :deep(.el-switch__label) {
  color: #fff !important;
}
</style>
