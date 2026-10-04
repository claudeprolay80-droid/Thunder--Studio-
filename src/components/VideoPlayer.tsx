import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Sparkles,
  Sliders,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  BlurBoxConfig,
  SubtitleStyleConfig,
  SubtitleChunk,
  RecapSegment
} from '../types/index.ts';

interface VideoPlayerProps {
  videoUrl: string;
  durationSeconds: number;
  subtitles: SubtitleChunk[];
  recapSegments: RecapSegment[];
  blurBox: BlurBoxConfig;
  subtitleStyle: SubtitleStyleConfig;
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
  onTimeUpdate,
  externalCurrentTime
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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
    // Find recap segment matching current time
    const activeSeg = recapSegments.find(
      (seg) => seg.audioUrl && time >= seg.start && time <= (seg.end + 0.5)
    );

    if (activeSeg && activeSeg.audioUrl) {
      if (activeVoiceSegmentId !== activeSeg.id) {
        setActiveVoiceSegmentId(activeSeg.id);
        // Play narration segment audio
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
        }
        audioPlayerRef.current.src = activeSeg.audioUrl;
        const segmentOffset = Math.max(0, time - activeSeg.start);
        audioPlayerRef.current.currentTime = segmentOffset;
        audioPlayerRef.current.playbackRate = playbackSpeed;
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Video Canvas Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group select-none">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />

        {/* 1. Subtitle Blur Box Overlay (Live Preview of Blur Mask) */}
        {blurBox.enabled && (
          <div
            className="absolute pointer-events-none transition-all duration-75"
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

        {/* 2. Burmese Recap Subtitle Overlay */}
        {currentSubtitle && (
          <div
            className="absolute left-0 right-0 flex justify-center pointer-events-none px-6 transition-all duration-100 z-10"
            style={{
              bottom: `${subtitleStyle.bottomMarginPercent}%`
            }}
          >
            <div
              className="inline-block px-4 py-2 rounded-xl text-center font-medium shadow-2xl transition-all"
              style={{
                fontSize: `${subtitleStyle.fontSize}px`,
                color: subtitleStyle.textColor,
                backgroundColor: subtitleStyle.bgColor,
                opacity: subtitleStyle.bgOpacity,
                fontFamily: `'Noto Sans Myanmar', 'Padauk', sans-serif`,
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px #000',
                maxWidth: '90%'
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
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/90 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-2xl transition transform hover:scale-110"
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

            {/* Volume */}
            <div className="flex items-center space-x-2 pl-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-zinc-400 hover:text-zinc-200 transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
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
