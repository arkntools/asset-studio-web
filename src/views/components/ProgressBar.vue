<template>
  <el-progress
    :key="progress.type"
    class="progress-bar"
    :indeterminate="progress.indeterminate"
    :text-inside="true"
    :stroke-width="20"
    :percentage="progress.indeterminate ? 100 : progress.value"
    :format="pct => (progress.indeterminate ? '' : `${pct.toFixed(2)}%`)"
  />
  <div class="progress-desc">{{ progress.desc }}</div>
</template>

<script setup lang="ts">
import { useProgress } from '@/store/progress';

const progress = useProgress();
</script>

<style lang="scss" scoped>
.progress-bar {
  --el-border-color-lighter: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  width: 50%;
  max-width: 400px;

  :deep(.el-progress-bar__inner) {
    transition: none;
  }
}

.progress-desc {
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
  margin-left: 16px;
  line-height: 24px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
