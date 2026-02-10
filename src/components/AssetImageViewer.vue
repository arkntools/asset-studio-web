<template>
  <div class="asset-image-viewer">
    <el-splitter>
      <el-splitter-panel v-if="imgList.length" v-model:size="menuWidth" :min="100" class="asset-image-viewer-panel">
        <el-scrollbar class="menu-scroll-view">
          <el-menu ref="menu" @select="handleSelect">
            <el-menu-item v-for="item in imgList" :key="item.key" :index="item.key">
              <span class="img-name">{{ item.name }}</span>
            </el-menu-item>
          </el-menu>
        </el-scrollbar>
      </el-splitter-panel>
      <el-splitter-panel :min="200" class="asset-image-viewer-panel">
        <ImageViewer :src="data" :name="name" />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import ImageViewer from '@/components/ImageViewer.vue';
import { PreviewType } from '@/types/preview';
import type { AssetInfo } from '@/workers/assetManager';

const { asset, data } = defineProps<{
  asset: AssetInfo;
  data: string | null;
}>();

const emits = defineEmits<{
  updatePayload: [key?: string];
}>();

const menuRef = useTemplateRef('menu');

const menuWidth = useLocalStorage('asset-image-viewer-menu-width', 200, {
  writeDefaults: false,
  listenToStorageChanges: false,
});

const imgList = computed(() => (asset.preview.type === PreviewType.ImageList ? asset.preview.detail : []));
const imgMap = computed(() => new Map(imgList.value.map(item => [item.key, item])));

const curSelectKey = ref<string>('');
const curSelectItem = computed(() => imgMap.value.get(curSelectKey.value));

const name = computed(() => (imgList.value.length ? curSelectItem.value?.name : asset.name));

const handleSelect = (key: string) => {
  curSelectKey.value = key;
};

watch(
  imgList,
  list => {
    if (!imgMap.value.has(curSelectKey.value)) {
      curSelectKey.value = list[0]?.key || '';
    }
  },
  { immediate: true },
);

watch(
  curSelectKey,
  key => {
    emits('updatePayload', key);
  },
  { immediate: true },
);

watch(
  [curSelectKey, menuRef],
  async ([key, menu]) => {
    await nextTick();
    // @ts-ignore
    menu?.updateActiveIndex(key);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.asset-image-viewer {
  position: relative;
  width: 100%;
  height: 100%;

  :deep(.asset-image-viewer-panel) {
    position: relative;
    overflow: unset;
  }
}

.menu-scroll-view {
  --el-menu-item-height: 36px;
  position: absolute;
  inset: 0;
}

.img-name {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
