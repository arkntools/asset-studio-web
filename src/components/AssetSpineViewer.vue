<template>
  <div class="asset-spine-viewer bg-transparent-grid">
    <SpinePlayerAsync
      v-if="spine"
      :key="asset.pathId.toString()"
      v-bind="spine"
      v-model:scale="scale"
      :bg-color="previewBgColor"
    />
    <div class="control-wrapper">
      <ColorPicker
        v-model="bgColor"
        v-model:preview="previewBgColor"
        :predefine="['#00000000', '#ffffffff', '#000000ff', '#808080ff', '#00ff00ff']"
      />
      <el-slider
        v-model="scale"
        class="scale-slider"
        vertical
        height="200px"
        :min="0.1"
        :max="1.9"
        :step="0.01"
        :show-tooltip="false"
        :marks="{ 1: '' }"
      />
      <el-button circle @click="scale = 1">
        <el-icon><i-el-full-screen /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssetObject } from '@arkntools/unity-js';
import { useLocalStorage } from '@vueuse/core';
import { groupBy } from 'es-toolkit';
import { every } from 'es-toolkit/compat';
import type { SpineItem } from '@/workers/assetManager/utils/cache';
import ColorPicker from './ColorPicker.vue';
import { SpinePlayerAsync } from './SpinePlayer';

const { data } = defineProps<{
  asset: AssetObject;
  data: SpineItem<string>[] | null;
}>();

const bgColor = useLocalStorage('asset-spine-viewer-bg-color', '#00000000', { writeDefaults: false });
const previewBgColor = ref('');
const scale = ref(1);

const spine = computed(() => {
  if (!data) return null;
  const { skel = [], atlas = [], image = [] } = groupBy(data, item => item.type);
  if (!every([skel, atlas, image], items => items.length)) return null;
  return {
    skel: skel[0].data,
    atlas: atlas[0].data,
    images: Object.fromEntries(image.map(({ name, data }) => [name, data])),
  };
});
</script>

<style lang="scss" scoped>
.asset-spine-viewer {
  width: 100%;
  height: 100%;
}

.control-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  position: absolute;
  top: 8px;
  right: 8px;

  .scale-slider {
    --el-slider-runway-bg-color: var(--el-color-primary);
  }
}
</style>
