import type { TextAsset } from '@arkntools/unity-js';
import { isJSON, isString } from 'es-toolkit';
import type { RepoDataHandler } from '@/types/repository';
import { isData } from '../utils/is';
import { AssetLoader, PreviewType } from './default';
import type { AssetExportItem, PreviewDetail } from './default';

export class TextAssetLoader extends AssetLoader<TextAsset> {
  protected static readonly textDecoder = new TextDecoder('utf-8');

  override canExport(): boolean {
    return true;
  }

  override async export(dataHandler?: RepoDataHandler): Promise<AssetExportItem[] | null> {
    const data = dataHandler ? await dataHandler(this.object.data) : this.object.data;
    if (isJSON(data)) {
      return [
        {
          name: `${this.objNameForFile}.json`,
          blob: new Blob([data], { type: 'application/json' }),
        },
      ];
    }
    return [
      {
        name: `${this.objNameForFile}.txt`,
        blob: new Blob([data as BlobPart], { type: 'text/plain' }),
      },
    ];
  }

  override getPreviewDetail(): PreviewDetail {
    return { type: PreviewType.Text };
  }

  override async getPreviewData(payload?: any, dataHandler?: RepoDataHandler) {
    const data = dataHandler ? await dataHandler(this.object.data) : this.object.data;
    if (isData(data)) {
      return TextAssetLoader.textDecoder.decode(data);
    }
    return isString(data) ? data : String(data);
  }
}
