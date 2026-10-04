import {
  VideoMetadata,
  TranscriptSegment,
  RecapSegment,
  SubtitleChunk,
  BlurBoxConfig,
  SubtitleStyleConfig,
  VoiceSettingsConfig
} from '../types/index.ts';

const API_KEY_STORAGE_KEY = 'thunder_studio_gemini_key';

export class ApiClient {
  static getStoredApiKey(): string {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  }

  static setStoredApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }

  static async testApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/settings/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    return res.json();
  }

  static async uploadVideo(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('video', file);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.metadata) {
              resolve(data.metadata);
            } else {
              reject(new Error(data.error || 'Upload failed'));
            }
          } catch (err: any) {
            reject(new Error(`Failed to parse upload response: ${err.message}`));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
          } catch (_) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during video upload.'));
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  }

  static async loadDemoVideo(): Promise<VideoMetadata> {
    const res = await fetch('/api/sample-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load demo video.');
    }
    return data.metadata;
  }

  static async extractAudio(
    filename: string,
    jobId: string
  ): Promise<{ audioFilename: string; audioUrl: string }> {
    const res = await fetch('/api/extract-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, jobId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Audio extraction failed.');
    }
    return data;
  }

  static async generateTranscript(
    audioFilename: string,
    apiKey: string,
    videoDuration: number,
    jobId: string
  ): Promise<TranscriptSegment[]> {
    const res = await fetch('/api/generate-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioFilename, apiKey, videoDuration, jobId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Transcript generation failed.');
    }
    return data.segments;
  }

  static async generateRecap(
    transcriptSegments: TranscriptSegment[],
    apiKey: string,
    videoDuration: number,
    jobId: string
  ): Promise<{ recapSegments: RecapSegment[]; subtitleChunks: SubtitleChunk[] }> {
    const res = await fetch('/api/generate-recap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptSegments, apiKey, videoDuration, jobId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Recap generation failed.');
    }
    return data;
  }

  static async generateVoiceAll(
    recapSegments: RecapSegment[],
    voiceSettings: VoiceSettingsConfig,
    jobId: string
  ): Promise<RecapSegment[]> {
    const res = await fetch('/api/generate-voice-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recapSegments, voiceSettings, jobId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Burmese Edge TTS generation failed.');
    }
    return data.recapSegments;
  }

  static async generateVoiceSegment(
    segment: RecapSegment,
    voiceSettings: VoiceSettingsConfig
  ): Promise<{ audioUrl: string; audioDuration: number; speedAdjustment?: number }> {
    const res = await fetch('/api/generate-voice-segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment, voiceSettings })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Voice generation failed for segment.');
    }
    return data;
  }

  static async recalculateSubtitles(recapSegments: RecapSegment[]): Promise<SubtitleChunk[]> {
    const res = await fetch('/api/chunk-subtitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recapSegments })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Subtitle chunking failed.');
    }
    return data.subtitleChunks;
  }

  static async renderFinalVideo({
    videoFilename,
    recapSegments,
    subtitles,
    blurBox,
    subtitleStyle,
    videoDuration,
    jobId
  }: {
    videoFilename: string;
    recapSegments: RecapSegment[];
    subtitles: SubtitleChunk[];
    blurBox: BlurBoxConfig;
    subtitleStyle: SubtitleStyleConfig;
    videoDuration: number;
    jobId: string;
  }): Promise<{ renderedUrl: string; outputFilename: string; sizeBytes: number }> {
    const res = await fetch('/api/render-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoFilename,
        recapSegments,
        subtitles,
        blurBox,
        subtitleStyle,
        videoDuration,
        jobId
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Video rendering failed.');
    }
    return data;
  }

  static async pollProgress(
    jobId: string
  ): Promise<{ percent: number; status: string; error?: string }> {
    const res = await fetch(`/api/progress/${jobId}`);
    return res.json();
  }
}
