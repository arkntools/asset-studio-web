<template>
  <div class="as-color-picker">
    <el-color-picker
      v-model="value"
      popper-class="as-color-picker-popper"
      size="large"
      color-format="hex"
      placement="bottom-end"
      :show-alpha="true"
      :predefine="predefine"
      @active-change="handleActiveChange"
      @hide="handleHide"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  predefine?: string[];
}>();

const value = defineModel<string>();
const previewValue = defineModel<string>('preview');
const activeValue = ref<string | null>(null);

watch(
  () => activeValue.value || value.value,
  v => {
    previewValue.value = v;
  },
  { immediate: true },
);

const handleActiveChange = (v: string | null) => {
  activeValue.value = v;
};

const handleHide = () => {
  activeValue.value = null;
};
</script>

<style lang="scss" scoped>
.as-color-picker {
  :deep(.el-color-picker__trigger) {
    background-color: #fff;
  }
}
</style>

<style lang="scss">
.as-color-picker-popper {
  .el-color-predefine__color-selector {
    margin-top: 6px;
    &.is-alpha > div {
      background-color: transparent !important;
    }
    &:not(.selected) {
      box-shadow: 0 0 3px 2px rgba(0, 0, 0, 0.12);
    }
  }
  .el-color-dropdown__btns {
    margin-top: 4px;
  }
}
</style>
