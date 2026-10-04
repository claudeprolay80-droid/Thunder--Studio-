import React, { useRef, useState } from 'react';
import {
  Film,
  Download,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Maximize2,
  Volume2,
  Subtitles,
  Mic,
  RotateCcw,
  Sparkles,
  Loader2,
  FileCheck
} from 'lucide-react';
import { VideoMetadata } from '../types/index.ts';

interface RenderExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRendering: boolean;
  renderProgress: number;
  renderedVideoUrl: string | null;
  outputFilename: string | null;
  outputSizeBytes: number;
  metadata: VideoMetadata | null;
  onRestartNewRecap: () => void;
}

export const RenderExportModal: React.FC<RenderExportModalProps> = ({
  isOpen,
  onClose,
  isRendering,
  renderProgress,
  renderedVideoUrl,
  outputFilename,
  outputSizeBytes,
  metadata,
  onRestartNewRecap
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (!renderedVideoUrl) return;
    const a = document.createElement('a');
    a.href = renderedVideoUrl;
    a.download = outputFilename || 'thunder-recap-final.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative text-zinc-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Rendering In Progress View */}
        {isRendering ? (
          <div className="py-12 px-4 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/60 flex items-center justify-center">
                <Film className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-zinc-100">
                Rendering Final Burmese Movie Recap
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                FFmpeg is mixing ducked background audio, burning in the subtitle blur mask, and synthesizing
                time-aligned Noto Sans Myanmar subtitles into the high-definition video track.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-2">
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden border border-zinc-700">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 transition-all duration-300 rounded-full shadow-lg shadow-amber-500/30"
                  style={{ width: `${Math.max(5, renderProgress)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-zinc-400 px-1">
                <span>Rendering video & audio tracks</span>
                <span className="font-bold text-amber-400">{renderProgress}%</span>
              </div>
            </div>
          </div>
        ) : (
          /* Render Complete View */
          <div className="space-y-6">
            {/* Title Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-zinc-100">Processing Complete!</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      READY
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    {outputFilename || 'thunder-recap-final.mp4'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 transition"
              >
                Close
              </button>
            </div>

            {/* Video Player */}
            {renderedVideoUrl && (
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl group">
                <video
                  ref={videoRef}
                  src={renderedVideoUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  controls
                  className="w-full h-full object-contain cursor-pointer"
                />
              </div>
            )}

            {/* Specs Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px] mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Duration</span>
                </div>
                <span className="text-xs font-bold text-zinc-200 font-mono">
                  {formatDuration(metadata?.durationSeconds || 0)}
                </span>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px] mb-1">
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Resolution</span>
                </div>
                <span className="text-xs font-bold text-zinc-200 font-mono">
                  {metadata?.width || 1280} × {metadata?.height || 720}
                </span>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px] mb-1">
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Audio Mix</span>
                </div>
                <span className="text-xs font-bold text-zinc-200">
                  Ducked + Narration
                </span>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px] mb-1">
                  <Subtitles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Subtitles</span>
                </div>
                <span className="text-xs font-bold text-zinc-200">
                  Burmese Hardburned
                </span>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px] mb-1">
                  <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>File Size</span>
                </div>
                <span className="text-xs font-bold text-zinc-200 font-mono">
                  {outputSizeBytes > 0 ? formatSize(outputSizeBytes) : 'Optimized'}
                </span>
              </div>
            </div>

            {/* Final Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onRestartNewRecap}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold flex items-center justify-center space-x-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Create Another Recap</span>
              </button>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Play Video'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 text-xs font-bold shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP4</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
