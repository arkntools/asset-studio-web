import { AssetType, loadAssetBundle } from '@arkntools/unity-js';
import type { AssetObject, Bundle, BundleLoadOptions } from '@arkntools/unity-js';
import type { FsbConvertFormat } from '@arkntools/unity-js/audio';
import { FsaError, FsaErrorCode, FsaPromises } from '@tsuk1ko/fsa-promises';
import { expose } from 'comlink';
import { md5 as calcMd5 } from 'js-md5';
import { ExportGroupMethod } from '@/types/export';
import { PromisePool } from '@/utils/promisePool';
import { clearCache, createLoader } from './loaders';
import type { AssetExportItem, PreviewInfo } from './loaders';
import { AudioClipLoader } from './loaders/audioClip';
import { RenameProcessor } from './utils/rename';

export interface AssetInfo {
  key: string;
  fileId: string;
  fileName: string;
  name: string;
  container: string;
  type: string;
  pathId: bigint;
  size: number;
  preview: PreviewInfo;
  canExport: boolean;
}

export interface FileLoadingError {
  name: string;
  error: string;
}

export type FileLoadingOnProgress = (param: { name: string; progress: number; totalAssetNum: number }) => any;

export type ExportAssetsOnProgress = (param: { progress: number; name: string }) => any;

type ObjectPathGetter = (obj: AssetObject, fileName: string) => string;

const THREAD_NUM = Math.max(navigator.hardwareConcurrency, 1);

export class AssetManager {
  private bundleMap = new Map<string, Bundle>();

  static setFsbConverter(fsbConverter: (typeof AudioClipLoader)['fsbConverter']) {
    AudioClipLoader.fsbConverter = fsbConverter;
  }

  static setFsbConvertFormat(fsbConvertFormat: FsbConvertFormat) {
    AudioClipLoader.convertFormat = fsbConvertFormat;
  }

  clear() {
    this.bundleMap.clear();
    clearCache();
  }

  async loadFiles(files: File[], options: BundleLoadOptions, onProgress: FileLoadingOnProgress) {
    const errors: Array<FileLoadingError> = [];
    const infos: AssetInfo[] = [];
    let successNum = 0;
    for (const [i, file] of files.entries()) {
      try {
        onProgress({
          name: file.name,
          progress: (i / files.length) * 100,
          totalAssetNum: infos.length,
        });
        const timeLabel = `[AssetManager] load ${file.name}`;
        console.time(timeLabel);
        const result = await this.loadFile(file, options);
        console.timeEnd(timeLabel);
        console.log(`[AssetManager] ${result.length} assets loaded from ${file.name}`);
        if (result.length) {
          successNum++;
          infos.push(...result);
        }
      } catch (error) {
        errors.push({ name: file.name, error: String(error) });
        console.error(`[AssetManager] failed to load ${file.name}`);
        console.error(error);
      }
    }
    return { errors, infos, successNum };
  }

  async getPreviewData(fileId: string, pathId: bigint, payload?: any) {
    const obj = this.getAssetObj(fileId, pathId);
    if (!obj) return null;
    return await createLoader(obj).getPreviewData(payload);
  }

  async exportAsset(handle: FileSystemDirectoryHandle, fileId: string, pathId: bigint) {
    const obj = this.getAssetObj(fileId, pathId);
    if (!obj) return;
    const loader = createLoader(obj);
    if (!loader.canExport()) return;
    const items = await loader.export();
    if (!items?.length) return;

    let success = 0;
    const { errorStat, errorHandler } = this.createWriteFileErrorHandler();
    const fs = new FsaPromises({ root: handle, cacheDirHandle: true });
    const pool = new PromisePool(
      THREAD_NUM,
      async ({ name, blob }: AssetExportItem) => {
        await fs.writeFile(name, blob, { flag: 'wx', ensureDir: true });
        success++;
      },
      errorHandler,
    );
    pool.addTasks(new RenameProcessor().process(items));
    await pool.wait();

    return { success, ...errorStat };
  }

  async exportAssets(
    handle: FileSystemDirectoryHandle,
    params: Array<{ fileId: string; pathId: bigint; fileName: string }>,
    { groupMethod }: { groupMethod: ExportGroupMethod },
    onProgress: ExportAssetsOnProgress,
  ) {
    let totalNum = params.length;
    let finishedNum = 0;

    const minusTotalNum = () => {
      totalNum--;
    };

    let success = 0;
    const { errorStat, errorHandler } = this.createWriteFileErrorHandler();
    const fs = new FsaPromises({ root: handle, cacheDirHandle: true });
    const pool = new PromisePool(
      THREAD_NUM,
      async ({ name, blob }: AssetExportItem) => {
        onProgress({ progress: ++finishedNum / totalNum, name });
        await fs.writeFile(name, blob, { flag: 'wx', ensureDir: true });
        success++;
      },
      errorHandler,
    );

    const renameProcessor = new RenameProcessor();
    const objPathGetter = this.createObjPathGetter(groupMethod);

    await Promise.all(
      params.map(async ({ fileId, pathId, fileName }) => {
        const obj = this.getAssetObj(fileId, pathId);
        if (!obj) return minusTotalNum();
        const loader = createLoader(obj);
        if (!loader.canExport()) return minusTotalNum();
        const items = await loader.export();
        if (!items?.length) return minusTotalNum();
        if (items.length > 1) totalNum += items.length - 1;
        pool.addTasks(renameProcessor.process(items, objPathGetter(obj, fileName)));
      }),
    );

    await pool.wait();

    return { success, ...errorStat };
  }

  private getAssetObj(fileId: string, pathId: bigint) {
    return this.bundleMap.get(fileId)?.objectMap.get(pathId);
  }

  private async loadFile(file: File, options?: BundleLoadOptions) {
    const buffer = await file.arrayBuffer();
    const md5 = calcMd5(buffer);

    const fileInfo = { fileId: md5, fileName: file.name };
    const bundle = this.bundleMap.get(md5) || (await loadAssetBundle(buffer, options));
    if (!this.bundleMap.has(md5)) this.bundleMap.set(md5, bundle);

    return Promise.all(
      bundle.objects
        .filter(obj => obj.type !== AssetType.AssetBundle)
        .map(async (obj): Promise<AssetInfo> => {
          const { name, type, pathId, size } = obj;
          const loader = createLoader(obj);
          return {
            ...fileInfo,
            key: `${fileInfo.fileId}_${pathId}`,
            name,
            container: bundle.getContainer(pathId),
            type: AssetType[type] || '',
            pathId,
            size,
            preview: loader.getPreviewInfo(),
            canExport: loader.canExport(),
          };
        }),
    );
  }

  private createObjPathGetter(groupMethod: ExportGroupMethod): ObjectPathGetter {
    switch (groupMethod) {
      case ExportGroupMethod.NONE:
        return () => '';
      case ExportGroupMethod.CONTAINER_PATH:
        return obj => obj.container;
      case ExportGroupMethod.TYPE_NAME:
        return obj => AssetType[obj.type] || '';
      case ExportGroupMethod.SOURCE_FILE_NAME:
        return (_, fileName) => fileName;
      default:
        return () => '';
    }
  }

  private createWriteFileErrorHandler() {
    const errorHandler = (e: unknown, item: AssetExportItem) => {
      if (e instanceof FsaError && e.code === FsaErrorCode.EEXIST) {
        ret.errorStat.skip++;
        console.warn(`[AssetManager] file ${item.name} already exists, skip`);
        return;
      }
      ret.errorStat.error++;
      console.error(`[AssetManager] failed to export ${item.name}`);
      console.error(e);
    };
    const ret = {
      errorStat: {
        skip: 0,
        error: 0,
      },
      errorHandler,
    };
    return ret;
  }
}

expose({ AssetManager });
