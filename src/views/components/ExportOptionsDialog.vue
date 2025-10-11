<template>
  <el-dialog v-model="show" title="Export options" width="min(500px, calc(100vw - 16px))">
    <el-form label-width="auto" label-position="top">
      <el-form-item label="Group exported assets by">
        <el-select v-model="setting.data.exportGroupMethod" :style="{ width: '200px' }">
          <el-option v-for="{ label, value } in exportGroupMethodOptions" :key="value" :label="label" :value="value" />
        </el-select>
      </el-form-item>
      <el-form-item class="fsb-convert-format" label="FSB audio convert format">
        <el-select v-model="setting.data.fsbConvertFormat" :style="{ width: '200px' }">
          <el-option v-for="{ label, value } in fsbConvertFormatOptions" :key="value" :label="label" :value="value" />
        </el-select>
        <div style="line-height: 1.5; margin-top: 4px">
          <el-text type="info">Only affects the export format. The preview format is always WAV.</el-text>
        </div>
      </el-form-item>
      <el-form-item v-if="setting.data.fsbConvertFormat === FsbConvertFormat.MP3" label="MP3 VBR quality">
        <el-slider
          v-model="fsbConvertVbrQuality"
          class="vbr-quality-slider"
          show-stops
          :step="1"
          :min="0"
          :max="9"
          :marks="fsbConvertVbrQualitySliderMarks"
          :show-tooltip="false"
        />
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script setup lang="ts">
import { FsbConvertFormat, useSetting } from '@/store/setting';
import { ExportGroupMethod } from '@/types/export';

const setting = useSetting();

const show = ref(false);

const exportGroupMethodOptions: Array<{ label: string; value: ExportGroupMethod }> = [
  {
    label: 'do not group',
    value: ExportGroupMethod.NONE,
  },
  {
    label: 'type name',
    value: ExportGroupMethod.TYPE_NAME,
  },
  {
    label: 'source file name',
    value: ExportGroupMethod.SOURCE_FILE_NAME,
  },
  {
    label: 'container path',
    value: ExportGroupMethod.CONTAINER_PATH,
  },
];

const fsbConvertFormatOptions: Array<{ label: string; value: FsbConvertFormat }> = [
  {
    label: 'wav (32-bit float PCM)',
    value: FsbConvertFormat.WAV,
  },
  {
    label: 'mp3 (VBR)',
    value: FsbConvertFormat.MP3,
  },
];

const fsbConvertVbrQuality = computed({
  get: () => 9 - setting.data.fsbConvertVbrQuality,
  set: value => {
    setting.data.fsbConvertVbrQuality = 9 - value;
  },
});

const fsbConvertVbrQualitySliderMarks = {
  0: {
    label: 'lowest',
    style: {
      transform: 'translateX(-3px)',
    },
  },
  9: {
    label: 'highest',
    style: {
      transform: 'translateX(calc(-100% + 3px))',
    },
  },
};

defineExpose({
  open: () => {
    show.value = true;
  },
});
</script>

<style lang="scss" scoped>
.vbr-quality-slider {
  --el-slider-stop-bg-color: var(--el-color-info-light-5);
  width: 300px;
  margin: 0 3px;

  :deep(.el-slider__marks-stop:first-of-type) {
    background-color: var(--el-slider-main-bg-color);
  }
}

.fsb-convert-format {
  :deep(.el-form-item__content) {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
