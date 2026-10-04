import React, { useRef, useState } from 'react';
import {
  Upload,
  Film,
  Clock,
  Maximize2,
  Activity,
  Volume2,
  VolumeX,
  Trash2,
  Play,
  FileVideo,
  Loader2,
  Sparkles
} from 'lucide-react';
import { VideoMetadata } from '../types/index.ts';

interface VideoUploaderProps {
  metadata: VideoMetadata | null;
  onFileSelect: (file: File) => void;
  onRemoveVideo: () => void;
  onStartRecap: () => void;
  onLoadDemo: () => void;
  isUploading: boolean;
  uploadProgress: number;
  isProcessing: boolean;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  metadata,
  onFileSelect,
  onRemoveVideo,
  onStartRecap,
  onLoadDemo,
  isUploading,
  uploadProgress,
  isProcessing,
  hasApiKey,
  onOpenApiKeyModal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const validateAndSelect = (file: File) => {
    const validExtensions = /\.(mp4|mkv|mov|avi|webm)$/i;
    if (!validExtensions.test(file.name)) {
      alert('Invalid file format. Please upload an MP4, MKV, MOV, AVI, or WebM video.');
      return;
    }
    onFileSelect(file);
  };

  // Helper format seconds to HH:MM:SS
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

  // Helper format file size
  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/x-matroska,video/quicktime,video/x-msvideo,video/webm,.mp4,.mkv,.mov,.avi,.webm"
        className="hidden"
        onChange={handleFileChange}
      />

      {!metadata && !isUploading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition ${
            isDragging
              ? 'border-amber-400 bg-amber-500/10'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/70'
          }`}
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mb-4 group-hover:scale-105 transition shadow-lg">
            <Upload className="w-8 h-8 text-amber-400" />
          </div>
          <h4 className="text-base font-bold text-zinc-100 mb-1">
            Upload Movie or Scene Video
          </h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4">
            Drag and drop your video file here, or click to browse. Supports MP4, MKV, MOV, AVI, and WebM.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadDemo();
              }}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Use Test Demo Scene</span>
            </button>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {isUploading && (
        <div className="border border-zinc-700 rounded-2xl p-10 text-center bg-zinc-950/60">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto mb-4" />
          <h4 className="text-sm font-bold text-zinc-100 mb-2">Uploading and analyzing video...</h4>
          <p className="text-xs text-zinc-400 mb-4">Detecting codec, resolution, FPS, and audio streams</p>
          <div className="max-w-md mx-auto bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-400 h-2 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-xs font-mono text-zinc-400 mt-2 block">{uploadProgress}%</span>
        </div>
      )}

      {/* Uploaded Video Metadata Card */}
      {metadata && !isUploading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <FileVideo className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-100 truncate max-w-sm sm:max-w-md">
                  {metadata.originalName}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
                  <span>{formatSize(metadata.sizeBytes)}</span>
                  <span>•</span>
                  <span className="uppercase">{metadata.format.split(',')[0]}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onRemoveVideo}
                disabled={isProcessing}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-zinc-800/80 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700/80 hover:border-red-800/80 transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Remove Video</span>
              </button>
            </div>
          </div>

          {/* Video Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Duration */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex items-center space-x-3">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Duration</span>
                <span className="text-xs font-semibold text-zinc-200">
                  {formatDuration(metadata.durationSeconds)}
                </span>
              </div>
            </div>

            {/* Resolution */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex items-center space-x-3">
              <Maximize2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Resolution</span>
                <span className="text-xs font-semibold text-zinc-200">
                  {metadata.width} × {metadata.height}
                </span>
              </div>
            </div>

            {/* FPS */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex items-center space-x-3">
              <Activity className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Frame Rate</span>
                <span className="text-xs font-semibold text-zinc-200">{metadata.fps} FPS</span>
              </div>
            </div>

            {/* Audio Track */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex items-center space-x-3">
              {metadata.hasAudio ? (
                <Volume2 className="w-5 h-5 text-violet-400 flex-shrink-0" />
              ) : (
                <VolumeX className="w-5 h-5 text-zinc-600 flex-shrink-0" />
              )}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Audio Track</span>
                <span className="text-xs font-semibold text-zinc-200">
                  {metadata.hasAudio ? metadata.audioCodec?.toUpperCase() || 'Detected' : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Subtitle Info Badge */}
          {metadata.hasSubtitles && (
            <div className="text-xs bg-zinc-950/40 border border-zinc-800 px-3 py-2 rounded-xl text-zinc-400 flex items-center space-x-2">
              <Film className="w-4 h-4 text-amber-400" />
              <span>
                Original embedded subtitle tracks detected ({metadata.subtitleTracks?.length || 1}).
                Original subtitle blur mask is active.
              </span>
            </div>
          )}

          {/* Start Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            {!hasApiKey ? (
              <div className="flex items-center space-x-2 text-xs text-amber-400">
                <span>⚠️ Gemini API Key is required to begin AI transcription and recap.</span>
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="underline font-semibold hover:text-amber-300"
                >
                  Enter Key
                </button>
              </div>
            ) : (
              <span className="text-xs text-zinc-400">
                Ready to transcribe, script Burmese narration, and synchronize voice.
              </span>
            )}

            <button
              type="button"
              onClick={onStartRecap}
              disabled={isProcessing}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Recap Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-zinc-950" />
                  <span>Start Movie Recap</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
