import type { AudioClip, AudioClipGetResult } from '@arkntools/unity-js';
import { convertFsb, FsbConvertFormat } from '@arkntools/unity-js/audio';
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

export interface FsbConvertSettings {
  format: FsbConvertFormat;
  vbrQuality: number;
}

export class AudioClipLoader extends AssetLoader<AudioClip> {
  static convertSettings: FsbConvertSettings;

  private get cacheKey(): CacheKey {
    return {
      pathId: this.object.pathId,
    };
  }

  override canExport(): boolean {
    return true;
  }

  override async export(): Promise<AssetExportItem[] | null> {
    const { format } = AudioClipLoader.convertSettings;
    let blob = blobCache.get(this.cacheKey)?.blob;

    if (format !== 'wav' || !blob) {
      blob = await this.getAudioBlob();
      if (!blob) return null;
    }

    const ext = this.object.format === 'fsb' ? format : this.object.format;

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
      const data = audio.format === 'fsb' ? await this.convertFsb(audio, isPreview) : audio.data;
      return new Blob([data], {
        type:
          audio.format === 'fsb'
            ? isPreview
              ? mimeMap.wav
              : getMimeType(AudioClipLoader.convertSettings.format)
            : getMimeType(audio.format),
      });
    } catch (error) {
      console.error(error);
    }
  }

  private async convertFsb(params: AudioClipGetResult, isPreview?: boolean) {
    const { format, vbrQuality } = AudioClipLoader.convertSettings;
    return convertFsb(
      params,
      isPreview ? FsbConvertFormat.WAV : format,
      isPreview ? undefined : { vbrQuality: vbrQuality as any },
    );
  }
}
