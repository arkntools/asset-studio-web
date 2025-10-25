import { AssetType } from '@arkntools/unity-js';
import type { AssetObject } from '@arkntools/unity-js';
import type { PreviewDetail } from '@/types/preview';
import { PreviewType } from '@/types/preview';
import type { RepoDataHandler } from '@/types/repository';
import { getLegalFileName } from '../utils/path';

export * from '@/types/preview';

export type PreviewInfo = PreviewDetail & {
  typeTree: Record<string, any>;
  inspect: Record<string, any>;
};

export interface AssetExportItem {
  name: string;
  blob: Blob;
}

export class AssetLoader<T extends AssetObject = AssetObject> {
  constructor(protected readonly object: T) {}

  get objNameForFile(): string {
    return this.object.name
      ? getLegalFileName(this.object.name)
      : `${AssetType[this.object.type]}#${this.object.pathId}`;
  }

  canExport(): boolean {
    return false;
  }

  getPreviewInfo(): PreviewInfo {
    return {
      typeTree: this.object.getTypeTree(),
      inspect: this.object.dump(),
      ...this.getPreviewDetail(),
    };
  }

  getPreviewDetail(): PreviewDetail {
    return { type: PreviewType.None };
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  async getPreviewData(payload?: any, dataHandler?: RepoDataHandler): Promise<any> {
    return null;
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  async export(dataHandler?: RepoDataHandler): Promise<AssetExportItem[] | null> {
    return null;
  }
}
