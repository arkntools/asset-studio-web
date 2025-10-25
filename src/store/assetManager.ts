import { proxy, transfer, wrap } from 'comlink';
import { defineStore } from 'pinia';
import type { RepoDataHandler } from '@/types/repository';
import { showBatchFilesResultMessage, showNotingCanBeExportToast } from '@/utils/toasts';
import type { BatchFilesResult } from '@/utils/toasts';
import type { AssetInfo, ExportAssetsOnProgress, FileLoadingOnProgress } from '@/workers/assetManager';
import AssetManagerWorker from '@/workers/assetManager/index.js?worker';
import { useProgress } from './progress';
import { useRepository } from './repository';
import { useSetting } from './setting';

const { AssetManager } = wrap<typeof import('@/workers/assetManager')>(new AssetManagerWorker());

const manager = new AssetManager();

const pickExportDir = () => window.showDirectoryPicker({ id: 'export-assets', mode: 'readwrite' }).catch(console.error);

const showExportResultMessage = (result?: BatchFilesResult) => {
  showBatchFilesResultMessage('Exported', result);
};

export const useAssetManager = defineStore('assetManager', () => {
  const progressStore = useProgress();
  const setting = useSetting();
  const repository = useRepository();

  const assetInfos = shallowRef<AssetInfo[]>([]);
  const curAssetInfo = shallowRef<AssetInfo>();
  const isLoading = ref(false);

  const assetInfoMap = computed(() => new Map(assetInfos.value.map(info => [info.key, info])));

  AssetManager.setFsbConverter(
    proxy(async (params, isPreview) => {
      const { convertFsb, FsbConvertFormat } = await import('@arkntools/unity-js/audio');
      const data = await convertFsb(
        params,
        isPreview ? FsbConvertFormat.WAV : setting.data.fsbConvertFormat,
        isPreview ? undefined : { vbrQuality: setting.data.fsbConvertVbrQuality as any },
      );
      return transfer(data, [data.buffer]);
    }),
  );

  watch(
    () => setting.data.fsbConvertFormat,
    () => {
      AssetManager.setFsbConvertFormat(setting.data.fsbConvertFormat);
    },
    { immediate: true },
  );

  const canExport = ({ canExport }: AssetInfo) => canExport;

  const onProgress = proxy<FileLoadingOnProgress>(({ name, progress, totalAssetNum }) => {
    progressStore.setProgress({
      type: 'loading',
      value: progress,
      desc: `Loading ${name}, total assets: ${totalAssetNum}`,
    });
  });

  const loadFiles = async (files: File[]) => {
    if (isLoading.value) return;
    isLoading.value = true;
    curAssetInfo.value = undefined;
    try {
      const { errors, infos, successNum } = await (
        await manager
      ).loadFiles(
        files,
        {
          unityCNKey: setting.unityCNKey,
          env: setting.data.unityEnv,
        },
        onProgress,
      );
      assetInfos.value = infos;
      if (!infos.length) {
        ElMessage({
          message: `No assets loaded from ${files.length} files`,
          type: 'warning',
        });
      } else if (files.length === 1 && errors.length) {
        errors.forEach(({ name, error }) => {
          ElMessage({
            message: `Failed to load ${name}: ${error}`,
            type: 'error',
          });
        });
      } else {
        ElMessage({
          message: `Loaded ${infos.length} assets from ${successNum} files`,
          type: 'success',
        });
      }
    } catch (error) {
      ElMessage({
        message: `Failed to load: ${error}`,
        type: 'error',
      });
    } finally {
      isLoading.value = false;
      progressStore.clearProgress();
    }
  };

  const clearFiles = async () => {
    assetInfos.value = [];
    await (await manager).clear();
  };

  const getDataHandler = async (info: AssetInfo) => {
    const { dataHandler } = repository;
    try {
      if (dataHandler && (await dataHandler.needHandle(info))) {
        return proxy<RepoDataHandler>(data => dataHandler.handler(info, data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPreviewData = async (info: AssetInfo, payload?: any) => {
    return (await manager).getPreviewData(info.fileId, info.pathId, payload, await getDataHandler(info));
  };

  const setCurAssetInfo = (info: AssetInfo) => {
    curAssetInfo.value = info;
  };

  const exportAsset = async (info: AssetInfo) => {
    const { fileId, pathId, canExport } = info;
    if (!canExport) {
      showNotingCanBeExportToast();
      return;
    }
    const handle = await pickExportDir();
    if (!handle) return;
    showExportResultMessage(await (await manager).exportAsset(handle, fileId, pathId, await getDataHandler(info)));
  };

  const isBatchExporting = ref(false);

  const batchExportOnProgress = proxy<ExportAssetsOnProgress>(({ progress, name }) => {
    progressStore.setProgress({
      value: progress * 100,
      desc: `Exporting ${name}`,
    });
  });

  const batchExportAsset = async (infos: AssetInfo[]) => {
    if (isBatchExporting.value) return;
    isBatchExporting.value = true;
    try {
      const handle = await pickExportDir();
      if (!handle) return;
      progressStore.setProgress({
        type: 'exporting',
        desc: 'Exporting',
      });
      const dataHandlers = await Promise.all(infos.map(info => getDataHandler(info)));
      showExportResultMessage(
        await (
          await manager
        ).exportAssets(
          handle,
          infos.map(({ fileId, pathId, fileName }, i) => ({
            fileId,
            pathId,
            fileName,
            hasDataHandler: Boolean(dataHandlers[i]),
          })),
          { groupMethod: setting.data.exportGroupMethod },
          batchExportOnProgress,
          proxy((data, i) => dataHandlers[i]!(data)),
        ),
      );
      progressStore.setProgress({
        value: 100,
        desc: '',
      });
    } catch (error) {
      console.error(error);
    } finally {
      isBatchExporting.value = false;
      progressStore.clearProgress();
    }
  };

  const exportAllAssets = async () => {
    const canExportAssets = assetInfos.value.filter(canExport);
    if (!canExportAssets.length) {
      showNotingCanBeExportToast();
      return;
    }
    await batchExportAsset(assetInfos.value);
  };

  return {
    assetInfos,
    assetInfoMap,
    curAssetInfo,
    isLoading,
    isBatchExporting,
    loadFiles,
    clearFiles,
    loadPreviewData,
    setCurAssetInfo,
    exportAsset,
    batchExportAsset,
    exportAllAssets,
    canExport,
  };
});
