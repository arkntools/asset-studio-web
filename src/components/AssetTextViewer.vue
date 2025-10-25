<template>
  <TextViewerAsync :value />
  <FullSizeLoading :loading="loading" />
</template>

<script setup lang="ts">
import FullSizeLoading from './FullSizeLoading.vue';
import { TextViewerAsync } from './TextViewer';

defineOptions({
  inheritAttrs: false,
});

const { data } = defineProps<{
  asset: any;
  data: string | null;
  loading?: boolean;
}>();

const value = computed(() => (typeof data === 'string' ? data : ''));
</script>
