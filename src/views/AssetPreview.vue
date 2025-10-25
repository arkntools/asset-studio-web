<template>
  <el-tabs v-model="activePane" class="asset-preview" type="border-card">
    <el-tab-pane v-if="enablePreview" label="Preview" :name="PreviewTab.Preview" />
    <el-tab-pane label="Type tree" :name="PreviewTab.TypeTree" />
    <el-tab-pane label="Inspect" :name="PreviewTab.Inspect" />
    <div class="asset-preview-pane">
      <KeepAlive :exclude="['AssetTextViewer', 'AssetTypeTreeViewer']">
        <component
          :is="PreviewComponent"
          :asset="assetManager.curAssetInfo!"
          :data="previewData"
          :desc="enablePreview ? undefined : 'Preview disabled'"
          :loading="previewDataLoadingDebounced"
          @goto-asset="(pathId: any) => emits('gotoAsset', pathId)"
          @update-payload="(payload: any) => (previewPayload = payload)"
        />
      </KeepAlive>
    </div>
  </el-tabs>
</template>

<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { identity } from 'es-toolkit';
import AssetAudioViewer from '@/components/AssetAudioViewer.vue';
import AssetImageViewer from '@/components/AssetImageViewer.vue';
import AssetDumpViewer from '@/components/AssetInspectViewer.vue';
import AssetNoPreview from '@/components/AssetNoPreview.vue';
import AssetSpineViewer from '@/components/AssetSpineViewer.vue';
import AssetTextViewer from '@/components/AssetTextViewer.vue';
import AssetTypeTreeViewer from '@/components/AssetTypeTreeViewer.vue';
import { useRefDebouncedConditional } from '@/hooks/useRef';
import { useAssetManager } from '@/store/assetManager';
import { useSetting } from '@/store/setting';
import { PreviewType } from '@/types/preview';

const emits = defineEmits<{
  (e: 'gotoAsset', pathId: bigint): void;
}>();

enum PreviewTab {
  Preview = 'preview',
  TypeTree = 'typeTree',
  Inspect = 'inspect',
}

const assetManager = useAssetManager();
const setting = useSetting();

const enablePreview = computed(() => setting.data.enablePreview);
const activePane = ref(enablePreview.value ? PreviewTab.Preview : PreviewTab.TypeTree);

const previewPayload = shallowRef<any>();
const previewDataLoading = ref(false);
const previewDataLoadingDebounced = useRefDebouncedConditional({
  source: previewDataLoading,
  delay: 300,
  condition: identity,
});

watch(
  () => assetManager.curAssetInfo,
  () => {
    previewPayload.value = undefined;
    previewDataLoading.value = true;
  },
  { flush: 'sync' },
);

watch(enablePreview, v => {
  activePane.value = v
    ? PreviewTab.Preview
    : activePane.value === PreviewTab.Preview
      ? PreviewTab.TypeTree
      : activePane.value;
});

const previewDataAsync = computedAsync(
  async () => {
    if (!enablePreview.value) return null;
    const info = assetManager.curAssetInfo;
    if (!info) return null;
    const {
      preview: { type },
    } = info;
    if (type === PreviewType.None || (type === PreviewType.ImageList && !previewPayload.value)) return null;
    const data = await assetManager.loadPreviewData(
      info,
      type === PreviewType.ImageList ? previewPayload.value : undefined,
    );
    return data ?? null;
  },
  null,
  {
    evaluating: previewDataLoading,
  },
);

const previewData = computed(() => (previewDataLoading.value ? null : previewDataAsync.value));

const PreviewComponent = computed(() => {
  const info = assetManager.curAssetInfo;
  if (!info) return AssetNoPreview;
  switch (activePane.value) {
    case 'preview': {
      switch (info.preview.type) {
        case PreviewType.Image:
        case PreviewType.ImageList:
          return AssetImageViewer;
        case PreviewType.Text:
          return AssetTextViewer;
        case PreviewType.Audio:
          return AssetAudioViewer;
        case PreviewType.Spine:
          return AssetSpineViewer;
        default:
          return AssetNoPreview;
      }
    }
    case 'typeTree':
      return AssetTypeTreeViewer;
    case 'inspect':
      return AssetDumpViewer;
    default:
      return AssetNoPreview;
  }
});
</script>

<style lang="scss" scoped>
.asset-preview {
  --el-tabs-header-height: 36px;
  display: flex;
  width: 100%;
  height: 100%;

  &-pane {
    width: 100%;
    height: 100%;
  }

  :deep(.el-tabs__content) {
    padding: 0;
    flex-grow: 1;
    flex-shrink: 1;
    min-height: 0;
  }

  :deep(.el-tab-pane) {
    display: none;
  }
}
</style>
