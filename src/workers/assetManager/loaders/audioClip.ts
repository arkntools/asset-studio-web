import type { AudioClip, AudioClipGetResult } from '@arkntools/unity-js';
import type { FsbConvertFormat } from '@arkntools/unity-js/audio';
import { blobCache } from '../utils/cache';
import type { CacheKey } from '../utils/cache';
import { AssetLoader, PreviewType } from './default';
import type { AssetExportItem, PreviewDetail } from './default';

const mimeMap: Record<string, string | undefined> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
};

const getMimeType = (format: string) => mimeMap[format] ?? `audio/${format}`;

export class AudioClipLoader extends AssetLoader<AudioClip> {
  static fsbConverter: (params: AudioClipGetResult, isPreview?: boolean) => Promise<Uint8Array<ArrayBuffer>>;
  static convertFormat: FsbConvertFormat;

  private get cacheKey(): CacheKey {
    return {
      pathId: this.object.pathId,
    };
  }

  override canExport(): boolean {
    return true;
  }

  override async export(): Promise<AssetExportItem[] | null> {
    const { convertFormat } = AudioClipLoader;
    let blob = blobCache.get(this.cacheKey)?.blob;

    if (convertFormat !== 'wav' || !blob) {
      blob = await this.getAudioBlob();
      if (!blob) return null;
    }

    const ext = this.object.format === 'fsb' ? convertFormat : this.object.format;

    return [
      {
        name: `${this.objNameForFile}.${ext}`,
        blob,
      },
    ];
  }

  override getPreviewDetail(): PreviewDetail {
    return { type: PreviewType.Audio };
  }

  override async getPreviewData() {
    const key = this.cacheKey;
    const cachedUrl = blobCache.get(key)?.url;
    if (cachedUrl) return cachedUrl;

    const blob = await this.getAudioBlob(true);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    blobCache.set(key, { blob, url });
    return url;
  }

  private async getAudioBlob(isPreview?: boolean) {
    const audio = this.object.getAudio();

    try {
      return new Blob([audio.format === 'fsb' ? await AudioClipLoader.fsbConverter(audio, isPreview) : audio.data], {
        type:
          audio.format === 'fsb'
            ? isPreview
              ? mimeMap.wav
              : getMimeType(AudioClipLoader.convertFormat)
            : getMimeType(audio.format),
      });
    } catch (error) {
      console.error(error);
    }
  }
}
