<template>
  <el-container>
    <el-header height="auto" :style="{ padding: 0 }">
      <AppHeader @command-export="type => listRef?.doExport(type)" />
    </el-header>
    <el-container :style="{ minHeight: 0 }">
      <el-splitter class="view-splitter" lazy @collapse="(i, t, s) => (hasCollapse = s.some(v => !v))">
        <el-splitter-panel v-if="repoManager.showRepoPanel" v-model:size="resourceListSize" collapsible>
          <ResourceList />
        </el-splitter-panel>
        <el-splitter-panel v-model:size="assetListSize" collapsible>
          <AssetList ref="listRef" />
        </el-splitter-panel>
        <el-splitter-panel v-model:size="assetPreviewSize" collapsible>
          <AssetPreview @goto-asset="key => listRef?.gotoAsset(key)" />
        </el-splitter-panel>
      </el-splitter>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { StorageSerializers, useLocalStorage } from '@vueuse/core';
import type { UseStorageOptions } from '@vueuse/core';
import { useRepository } from './store/repository';
import AppHeader from './views/AppHeader.vue';
import AssetList from './views/AssetList.vue';
import AssetPreview from './views/AssetPreview.vue';
import ResourceList from './views/ResourceList.vue';

const repoManager = useRepository();

const listRef = ref<InstanceType<typeof AssetList>>();

const hasCollapse = ref(false);

const wrapStorage = (source: Ref<string | number>) => {
  const middleValue = ref(source.value);
  const writeControl = computed({
    get: () => middleValue.value,
    set: value => {
      middleValue.value = value;
      if (hasCollapse.value) return;
      source.value = value;
    },
  });
  return writeControl;
};

const storageOptions: UseStorageOptions<any> = {
  writeDefaults: false,
  serializer: StorageSerializers.object,
  listenToStorageChanges: false,
};

const resourceListSize = wrapStorage(useLocalStorage('app-panel-size-resourceList', '25%', storageOptions));
const assetListSize = wrapStorage(useLocalStorage('app-panel-size-assetList', '45%', storageOptions));
const assetPreviewSize = wrapStorage(useLocalStorage('app-panel-size-assetPreview', '30%', storageOptions));
</script>

<style lang="scss" scoped>
.view-splitter {
  & > :deep(.el-splitter-bar) {
    $width: 4px;

    width: $width !important;
    background-color: var(--el-color-info-light-9);
    z-index: 100;

    & > .el-splitter-bar {
      &__horizontal-collapse-icon {
        &-start {
          left: -10px;
        }
        &-end {
          left: 14px;
        }
      }

      &__dragger {
        --el-border-color-light: transparent;

        &::before,
        &::after {
          width: $width;
        }
      }
    }
  }
}
</style>
