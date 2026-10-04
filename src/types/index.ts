export interface VideoMetadata {
  filename: string;
  originalName: string;
  sizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  format: string;
  hasAudio: boolean;
  audioCodec?: string;
  hasSubtitles: boolean;
  subtitleTracks?: { index: number; language?: string; title?: string; codec?: string }[];
  videoUrl: string;
  audioUrl?: string;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface RecapSegment {
  id: string;
  start: number;
  end: number;
  english_recap: string;
  burmese_recap: string;
  audioUrl?: string;
  audioDuration?: number;
  speedAdjustment?: number;
  isGeneratingAudio?: boolean;
}

export interface SubtitleChunk {
  id: string;
  segmentId: string;
  start: number;
  end: number;
  text: string;
}

export interface BlurBoxConfig {
  enabled: boolean;
  xPercent: number; // 0 - 100
  yPercent: number; // 0 - 100
  widthPercent: number; // 0 - 100
  heightPercent: number; // 0 - 100
  strength: number; // 1 - 50
}

export interface SubtitleStyleConfig {
  fontSize: number; // in pixels (e.g. 24)
  textColor: string; // hex (e.g. #FFFFFF)
  bgColor: string; // hex (e.g. #000000)
  bgOpacity: number; // 0 - 1
  bottomMarginPercent: number; // 0 - 30
  fontFamily: string;
}

export interface VoiceSettingsConfig {
  voice: 'my-MM-NilarNeural' | 'my-MM-ThihaNeural';
  speed: number; // 0.8 - 2.0
  volume: number; // 0 - 100
  pitch: number; // -50 - 50
}

export type PipelineStepId =
  | 'upload'
  | 'extract-audio'
  | 'transcript'
  | 'recap'
  | 'translate'
  | 'voice'
  | 'subtitles'
  | 'blur'
  | 'render'
  | 'complete';

export interface StepStatus {
  id: PipelineStepId;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  error?: string;
}
