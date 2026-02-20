<template>
  <div v-if="isNumber(value)" class="resource-fetch-progress">
    <Transition name="res-fetch-progress-fade" mode="out-in">
      <el-progress
        v-if="value < 1 || isTransitioning"
        type="circle"
        :percentage="value * 100"
        :width="20"
        :stroke-width="3"
        :show-text="false"
        @transitionend="isTransitioning = false"
      />
      <el-icon v-else :size="20" color="var(--el-color-success)"><i-el-select /></el-icon>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { isNumber } from 'es-toolkit/compat';

const { value } = defineProps<{
  /** 0~1 */
  value?: number;
}>();

const isTransitioning = ref(false);

watch(
  () => value,
  (val, oldVal) => {
    if (isNumber(val) && val >= 1 && isNumber(oldVal) && oldVal < 1) {
      isTransitioning.value = true;
    }
  },
  { flush: 'sync' },
);
</script>

<style lang="scss" scoped>
.resource-fetch-progress {
  --el-fill-color-light: var(--el-fill-color-darker);
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  margin-right: -6px;

  :deep(.el-progress-circle__path) {
    transition-duration: 0.2s !important;
  }
}
</style>

<style lang="scss">
.res-fetch-progress-fade {
  &-enter-active,
  &-leave-active {
    transition: opacity 0.3s;
  }
  &-enter-from,
  &-leave-to {
    opacity: 0;
  }
}
</style>
