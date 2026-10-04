import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Sparkles,
  Crop,
  FlipHorizontal,
  ShieldCheck
} from 'lucide-react';
import {
  BlurBoxConfig,
  SubtitleStyleConfig,
  SubtitleChunk,
  RecapSegment,
  AudioSettings,
  VideoTransformConfig,
  CropConfig
} from '../types/index.ts';
import { InteractiveCropOverlay } from './InteractiveCropOverlay.tsx';

interface VideoPlayerProps {
  videoUrl: string;
  durationSeconds: number;
  subtitles: SubtitleChunk[];
  recapSegments: RecapSegment[];
  blurBox: BlurBoxConfig;
  subtitleStyle: SubtitleStyleConfig;
  audioSettings: AudioSettings;
  videoTransform: VideoTransformConfig;
  onChangeCrop?: (crop: CropConfig) => void;
  isCropToolActive?: boolean;
  videoWidth?: number;
  videoHeight?: number;
  onTimeUpdate?: (currentTime: number) => void;
  externalCurrentTime?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  durationSeconds,
  subtitles,
  recapSegments,
  blurBox,
  subtitleStyle,
  audioSettings,
  videoTransform,
  onChangeCrop,
  isCropToolActive = false,
  videoWidth = 1280,
  videoHeight = 720,
  onTimeUpdate,
  externalCurrentTime
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [activeVoiceSegmentId, setActiveVoiceSegmentId] = useState<string | null>(null);

  // Sync external seek (e.g. from clicking timeline segment)
  useEffect(() => {
    if (
      typeof externalCurrentTime === 'number' &&
      videoRef.current &&
      Math.abs(videoRef.current.currentTime - externalCurrentTime) > 0.3
    ) {
      videoRef.current.currentTime = externalCurrentTime;
      setCurrentTime(externalCurrentTime);
    }
  }, [externalCurrentTime]);

  // Sync Original Video Audio volume & muting
  useEffect(() => {
    if (videoRef.current) {
      const origVol = audioSettings.originalMuted
        ? 0
        : Math.min(1.0, Math.max(0, audioSettings.originalVolume));
      videoRef.current.volume = origVol;
      videoRef.current.muted = audioSettings.originalMuted || origVol === 0;
    }
  }, [audioSettings.originalVolume, audioSettings.originalMuted]);

  // Sync Burmese Voice volume
  useEffect(() => {
    if (audioPlayerRef.current) {
      const voiceVol = Math.min(1.0, Math.max(0, audioSettings.voiceVolume));
      audioPlayerRef.current.volume = voiceVol;
    }
  }, [audioSettings.voiceVolume]);

  // Video timeupdate handler
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) onTimeUpdate(time);

    // 1. Find active subtitle chunk
    const activeSub = subtitles.find((s) => time >= s.start && time <= s.end);
    setCurrentSubtitle(activeSub ? activeSub.text : '');

    // 2. Sync Burmese Voice narration audio
    const activeSeg = recapSegments.find(
      (seg) => seg.audioUrl && time >= seg.start && time <= (seg.end + 0.5)
    );

    if (activeSeg && activeSeg.audioUrl) {
      if (activeVoiceSegmentId !== activeSeg.id) {
        setActiveVoiceSegmentId(activeSeg.id);
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
        }
        audioPlayerRef.current.src = activeSeg.audioUrl;
        const segmentOffset = Math.max(0, time - activeSeg.start);
        audioPlayerRef.current.currentTime = segmentOffset;
        audioPlayerRef.current.playbackRate = playbackSpeed;
        audioPlayerRef.current.volume = Math.min(1.0, Math.max(0, audioSettings.voiceVolume));
        if (!videoRef.current.paused) {
          audioPlayerRef.current.play().catch(() => {});
        }
      }
    } else {
      if (activeVoiceSegmentId) {
        setActiveVoiceSegmentId(null);
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      if (audioPlayerRef.current && activeVoiceSegmentId) {
        audioPlayerRef.current.play().catch(() => {});
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = speed;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const cs = Math.floor((secs % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${cs}`;
  };

  // Compute Subtitle Overlay Positioning
  const getSubtitlePositionStyle = (): React.CSSProperties => {
    const vPos = subtitleStyle.verticalPosition || 'bottom';
    const yOffset = typeof subtitleStyle.yOffsetPercent === 'number'
      ? subtitleStyle.yOffsetPercent
      : (subtitleStyle.bottomMarginPercent || 8);

    const style: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      display: 'flex',
      pointerEvents: 'none',
      zIndex: 25,
      paddingLeft: '1.5rem',
      paddingRight: '1.5rem'
    };

    // Horizontal Alignment
    if (subtitleStyle.horizontalAlign === 'left') {
      style.justifyContent = 'flex-start';
    } else if (subtitleStyle.horizontalAlign === 'right') {
      style.justifyContent = 'flex-end';
    } else {
      style.justifyContent = 'center';
    }

    // Vertical Position
    if (vPos === 'top') {
      style.top = `${Math.max(4, yOffset)}%`;
    } else if (vPos === 'upper') {
      style.top = `${Math.max(12, yOffset)}%`;
    } else if (vPos === 'center') {
      style.top = '50%';
      style.transform = 'translateY(-50%)';
    } else if (vPos === 'lower') {
      style.bottom = `${Math.max(14, yOffset)}%`;
    } else {
      // bottom
      style.bottom = `${Math.max(4, yOffset)}%`;
    }

    return style;
  };

  // Text Shadow with outline & drop shadow
  const getTextShadow = () => {
    const shadows: string[] = [];
    if (subtitleStyle.outline !== false) {
      shadows.push('-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 6px #000');
    }
    if (subtitleStyle.shadow !== false) {
      shadows.push('0 4px 12px rgba(0,0,0,0.9)');
    }
    return shadows.join(', ') || 'none';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Video Canvas Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group select-none">
        {/* Video Element with Mirror Flip Transform */}
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
          style={{
            transform: videoTransform.mirror ? 'scaleX(-1)' : 'none',
            transition: 'transform 0.15s ease'
          }}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />

        {/* Mirror Active Indicator Badge */}
        {videoTransform.mirror && (
          <div className="absolute top-3 right-3 pointer-events-none z-20 flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-zinc-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-mono shadow">
            <FlipHorizontal className="w-3 h-3" />
            <span>MIRRORED</span>
          </div>
        )}

        {/* 1. Interactive Crop Overlay */}
        {(videoTransform.crop.enabled || isCropToolActive) && onChangeCrop && (
          <InteractiveCropOverlay
            crop={videoTransform.crop}
            onChangeCrop={onChangeCrop}
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            isCropToolActive={isCropToolActive}
          />
        )}

        {/* 2. Subtitle Blur Box Overlay (Live Preview of Blur Mask) */}
        {blurBox.enabled && (
          <div
            className="absolute pointer-events-none transition-all duration-75 z-10"
            style={{
              left: `${blurBox.xPercent}%`,
              top: `${blurBox.yPercent}%`,
              width: `${blurBox.widthPercent}%`,
              height: `${blurBox.heightPercent}%`,
              backdropFilter: `blur(${Math.max(4, blurBox.strength * 0.4)}px)`,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              border: '1px dashed rgba(245, 158, 11, 0.4)'
            }}
          >
            <span className="absolute top-1 left-2 text-[9px] font-mono text-amber-300/80 bg-zinc-950/70 px-1 rounded">
              Original Subtitle Blur Box
            </span>
          </div>
        )}

        {/* 3. Burmese Recap Subtitle Overlay with Safe Area & Typography */}
        {currentSubtitle && (
          <div style={getSubtitlePositionStyle()}>
            <div
              className="inline-block px-4 py-2 rounded-xl text-center font-medium shadow-2xl transition-all max-w-[90%]"
              style={{
                fontSize: `${subtitleStyle.fontSize}px`,
                color: subtitleStyle.textColor || '#FFFFFF',
                backgroundColor: subtitleStyle.bgColor || '#000000',
                opacity: subtitleStyle.bgOpacity ?? 0.75,
                fontFamily: `'Noto Sans Myanmar', 'Padauk', sans-serif`,
                textShadow: getTextShadow(),
                lineHeight: 1.3
              }}
            >
              {currentSubtitle}
            </div>
          </div>
        )}

        {/* Play / Pause Big Center Button Overlay */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/90 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-2xl transition transform hover:scale-110 z-20"
          >
            <Play className="w-8 h-8 fill-zinc-950 ml-1" />
          </button>
        )}
      </div>

      {/* Video Control Bar */}
      <div className="bg-zinc-950/90 border-t border-zinc-800 p-3 sm:p-4 space-y-2.5">
        {/* Timeline Progress Bar */}
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-mono text-zinc-400 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={durationSeconds || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
          />
          <span className="text-[11px] font-mono text-zinc-500 w-12">
            {formatTime(durationSeconds || 0)}
          </span>
        </div>

        {/* Lower Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Audio Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px]">
              {audioSettings.originalMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="font-mono text-zinc-300">
                Orig: {audioSettings.originalMuted ? 'Mute' : `${Math.round(audioSettings.originalVolume * 100)}%`}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="font-mono text-purple-300">
                Voice: {Math.round(audioSettings.voiceVolume * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Speed Selector */}
            <div className="flex items-center space-x-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60 text-xs">
              {[0.8, 1.0, 1.2, 1.5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-semibold transition ${
                    playbackSpeed === s
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={handleFullscreen}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
