<template>
  <div class="image-viewer" :class="{ 'bg-transparent-grid': isBgAlpha }" :style="{ '--bg-color': previewBgColor }">
    <el-image
      class="image"
      :src="useSrc"
      :infinite="false"
      :preview-src-list="src ? [src] : []"
      preview-teleported
      hide-on-click-modal
      fit="scale-down"
      @load="handleLoad"
    />
    <div v-if="imageInfo" class="image-info">
      <el-text class="image-info-text" size="large">{{ imageInfo }}</el-text>
    </div>
    <ColorPicker
      v-model="bgColor"
      v-model:preview="previewBgColor"
      class="bg-select"
      :predefine="['#00000000', '#ffffffff', '#808080ff', '#000000ff']"
    />
    <DownloadButton @click="handleDownload" />
    <FullSizeLoading :loading="!src" />
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import { saveAs } from 'file-saver';
import ColorPicker from './ColorPicker.vue';
import DownloadButton from './DownloadButton.vue';
import FullSizeLoading from './FullSizeLoading.vue';

const { src, name } = defineProps<{
  src?: string | null;
  name?: string;
}>();

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAAtJREFUGFdjYAACAAAFAAGq1chRAAAAAElFTkSuQmCC';

const bgColor = useLocalStorage('image-viewer-bg-color', '#00000000', { writeDefaults: false });
const previewBgColor = ref('');
const isBgAlpha = computed(() => {
  const color = previewBgColor.value;
  return color && !color.endsWith('ff');
});

const useSrc = computed(() => src || PNG_1PX);

const imageInfo = ref('');

const handleLoad = (e: Event) => {
  const img = e.target as HTMLImageElement;
  imageInfo.value = !img.src || img.src === PNG_1PX ? '' : `${img.naturalWidth}×${img.naturalHeight}`;
};

const handleDownload = () => {
  if (src) {
    saveAs(src, `${name || 'image'}.png`);
  }
};
</script>

<style lang="scss" scoped>
.image-viewer {
  position: relative;
  width: 100%;
  height: 100%;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--bg-color);
  }

  :deep(.el-image__placeholder) {
    display: none;
  }
}

.image {
  width: 100%;
  height: 100%;

  :deep(img) {
    -webkit-user-drag: none;
  }
}

.image-info {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: 4px;
  pointer-events: none;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.bg-select {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
