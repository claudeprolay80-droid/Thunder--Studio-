import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Crop,
  FlipHorizontal,
  RotateCcw,
  Palette,
  Sliders,
  ShieldCheck,
  Sparkles,
  Maximize2
} from 'lucide-react';
import {
  AudioSettings,
  SubtitleStyleConfig,
  VideoTransformConfig,
  CropPreset,
  SubtitleVerticalPosition,
  SubtitleHorizontalAlign
} from '../types/index.ts';

interface VideoEditorPanelProps {
  audioSettings: AudioSettings;
  onChangeAudio: (settings: AudioSettings) => void;
  subtitleStyle: SubtitleStyleConfig;
  onChangeSubtitleStyle: (style: SubtitleStyleConfig) => void;
  videoTransform: VideoTransformConfig;
  onChangeTransform: (transform: VideoTransformConfig) => void;
  onResetAllSettings: () => void;
  videoWidth: number;
  videoHeight: number;
  isCropToolActive: boolean;
  onToggleCropTool: () => void;
}

export const VideoEditorPanel: React.FC<VideoEditorPanelProps> = ({
  audioSettings,
  onChangeAudio,
  subtitleStyle,
  onChangeSubtitleStyle,
  videoTransform,
  onChangeTransform,
  onResetAllSettings,
  videoWidth,
  videoHeight,
  isCropToolActive,
  onToggleCropTool
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'subtitle' | 'transform'>('audio');

  // Audio update helpers
  const updateAudio = <K extends keyof AudioSettings>(key: K, val: AudioSettings[K]) => {
    onChangeAudio({
      ...audioSettings,
      [key]: val
    });
  };

  // Subtitle update helpers
  const updateSubtitle = <K extends keyof SubtitleStyleConfig>(key: K, val: SubtitleStyleConfig[K]) => {
    onChangeSubtitleStyle({
      ...subtitleStyle,
      [key]: val
    });
  };

  // Crop preset selection helper
  const handleSelectCropPreset = (preset: CropPreset) => {
    if (preset === 'original') {
      onChangeTransform({
        ...videoTransform,
        crop: {
          enabled: false,
          xPercent: 0,
          yPercent: 0,
          widthPercent: 100,
          heightPercent: 100,
          preset: 'original'
        }
      });
      return;
    }

    const videoRatio = videoWidth / videoHeight;
    let targetRatio = videoRatio;

    if (preset === '16:9') targetRatio = 16 / 9;
    else if (preset === '9:16') targetRatio = 9 / 16;
    else if (preset === '4:3') targetRatio = 4 / 3;
    else if (preset === '1:1') targetRatio = 1;

    let widthPercent = 100;
    let heightPercent = 100;

    if (targetRatio > videoRatio) {
      // Wider than video -> constrain height
      heightPercent = Math.min(100, Math.round((videoRatio / targetRatio) * 100));
    } else {
      // Taller than video -> constrain width
      widthPercent = Math.min(100, Math.round((targetRatio / videoRatio) * 100));
    }

    const xPercent = Math.round((100 - widthPercent) / 2);
    const yPercent = Math.round((100 - heightPercent) / 2);

    onChangeTransform({
      ...videoTransform,
      crop: {
        enabled: true,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        preset
      }
    });
  };

  const handleResetCrop = () => {
    handleSelectCropPreset('original');
  };

  const handleToggleMirror = (mirrored: boolean) => {
    onChangeTransform({
      ...videoTransform,
      mirror: mirrored
    });
  };

  const handleResetTransform = () => {
    onChangeTransform({
      mirror: false,
      crop: {
        enabled: false,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
        preset: 'original'
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Video Editor Suite</h4>
            <p className="text-xs text-zinc-400">
              Audio volumes, subtitle typography & safe positions, crop & mirror transforms
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetAllSettings}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold transition"
          title="Restore original audio volume, 36px font, bottom position, full frame, and no mirror"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Editor Sub-Tabs Navigation */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'audio'
              ? 'bg-amber-500 text-zinc-950 shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Audio Mix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subtitle')}
          className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'subtitle'
              ? 'bg-amber-500 text-zinc-950 shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Subtitle Style</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transform')}
          className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'transform'
              ? 'bg-amber-500 text-zinc-950 shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Crop className="w-3.5 h-3.5" />
          <span>Transform & Crop</span>
        </button>
      </div>

      {/* 1. AUDIO TAB */}
      {activeTab === 'audio' && (
        <div className="space-y-5 pt-1">
          {/* Original Video Audio Section */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-zinc-100">Original Video Audio</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-sky-400">
                  {audioSettings.originalMuted ? 'Muted (0%)' : `${Math.round(audioSettings.originalVolume * 100)}%`}
                </span>
                <button
                  type="button"
                  onClick={() => updateAudio('originalMuted', !audioSettings.originalMuted)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                    audioSettings.originalMuted
                      ? 'bg-red-950/50 border-red-800 text-red-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {audioSettings.originalMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-zinc-400" />}
                  <span>{audioSettings.originalMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={audioSettings.originalMuted ? 0 : audioSettings.originalVolume}
                disabled={audioSettings.originalMuted}
                onChange={(e) => {
                  updateAudio('originalVolume', parseFloat(e.target.value));
                  if (audioSettings.originalMuted) updateAudio('originalMuted', false);
                }}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-0.5">
                <span>0% (Mute)</span>
                <span>50%</span>
                <span className="font-bold text-zinc-400">100% (Original)</span>
                <span>150%</span>
                <span>200% (Max)</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">
              Lowers or boosts the original movie soundtrack in the final rendering and live preview.
            </p>
          </div>

          {/* Burmese Recap Voice Volume Section */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-zinc-100">Burmese Recap Voice Volume</span>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400">
                {Math.round(audioSettings.voiceVolume * 100)}%
              </span>
            </div>

            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={audioSettings.voiceVolume}
                onChange={(e) => updateAudio('voiceVolume', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-0.5">
                <span>0%</span>
                <span>50%</span>
                <span className="font-bold text-zinc-400">100% (Standard)</span>
                <span>150%</span>
                <span>200% (Loud)</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">
              Independent volume control for the synthesized Burmese narration audio.
            </p>
          </div>
        </div>
      )}

      {/* 2. SUBTITLE TAB */}
      {activeTab === 'subtitle' && (
        <div className="space-y-4 pt-1">
          {/* Font Size Control */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">Subtitle Font Size</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                Font Size: {subtitleStyle.fontSize}px
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={120}
              step={1}
              value={subtitleStyle.fontSize}
              onChange={(e) => updateSubtitle('fontSize', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>12px</span>
              <span className="text-zinc-400 font-bold">36px (Default)</span>
              <span>72px</span>
              <span>120px</span>
            </div>
          </div>

          {/* Subtitle Horizontal Alignment & Vertical Position */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
            <div>
              <span className="text-xs font-bold text-zinc-200 block mb-1.5">Horizontal Alignment</span>
              <div className="grid grid-cols-3 gap-2">
                {(['left', 'center', 'right'] as SubtitleHorizontalAlign[]).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateSubtitle('horizontalAlign', align)}
                    className={`py-1.5 rounded-lg text-xs font-semibold capitalize flex items-center justify-center space-x-1.5 border transition ${
                      subtitleStyle.horizontalAlign === align
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                    {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                    {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                    <span>{align}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-zinc-200 block mb-1.5">Vertical Position Presets</span>
              <div className="grid grid-cols-5 gap-1.5">
                {(['top', 'upper', 'center', 'lower', 'bottom'] as SubtitleVerticalPosition[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => {
                      updateSubtitle('verticalPosition', pos);
                      if (pos === 'bottom') updateSubtitle('yOffsetPercent', 8);
                      else if (pos === 'lower') updateSubtitle('yOffsetPercent', 18);
                      else if (pos === 'center') updateSubtitle('yOffsetPercent', 50);
                      else if (pos === 'upper') updateSubtitle('yOffsetPercent', 18);
                      else if (pos === 'top') updateSubtitle('yOffsetPercent', 6);
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition ${
                      subtitleStyle.verticalPosition === pos
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Fine adjustment slider */}
            <div className="pt-1 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">Fine Y Position Slider</span>
                <span className="font-mono text-amber-400 font-bold">{subtitleStyle.yOffsetPercent}%</span>
              </div>
              <input
                type="range"
                min={2}
                max={45}
                step={1}
                value={subtitleStyle.yOffsetPercent}
                onChange={(e) => updateSubtitle('yOffsetPercent', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Subtitle Safe Area: Automatically keeps text inside video boundaries</span>
              </div>
            </div>
          </div>

          {/* Color & Styling */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-400 block mb-1">Text Color</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={subtitleStyle.textColor}
                    onChange={(e) => updateSubtitle('textColor', e.target.value)}
                    className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-zinc-200 uppercase">{subtitleStyle.textColor}</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">Background Opacity ({Math.round(subtitleStyle.bgOpacity * 100)}%)</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={subtitleStyle.bgOpacity}
                  onChange={(e) => updateSubtitle('bgOpacity', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 pt-1">
              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitleStyle.outline}
                  onChange={(e) => updateSubtitle('outline', e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0"
                />
                <span>Black Outline</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitleStyle.shadow}
                  onChange={(e) => updateSubtitle('shadow', e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0"
                />
                <span>Drop Shadow</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRANSFORM & CROP TAB */}
      {activeTab === 'transform' && (
        <div className="space-y-4 pt-1">
          {/* Crop Tool Section */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crop className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-100">Video Crop Tool</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onToggleCropTool}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                    isCropToolActive
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {isCropToolActive ? 'Done Cropping' : 'Interactive Crop'}
                </button>
                <button
                  type="button"
                  onClick={handleResetCrop}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
                  title="Reset to full original frame"
                >
                  Reset Crop
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs text-zinc-400 block mb-1.5">Aspect Ratio Presets</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(['original', '16:9', '9:16', '4:3', '1:1', 'custom'] as CropPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectCropPreset(preset)}
                    className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition ${
                      videoTransform.crop.preset === preset
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {videoTransform.crop.enabled ? (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
                <span>
                  Active Crop: {Math.round((videoTransform.crop.widthPercent / 100) * videoWidth)} × {Math.round((videoTransform.crop.heightPercent / 100) * videoHeight)} px ({videoTransform.crop.preset})
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  X:{videoTransform.crop.xPercent}% Y:{videoTransform.crop.yPercent}%
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 italic">
                Original full-frame active ({videoWidth} × {videoHeight} px). Click "Interactive Crop" or choose a preset to crop.
              </p>
            )}
          </div>

          {/* Mirror Video Section */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FlipHorizontal className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-zinc-100">Mirror Video (Horizontal Flip)</span>
              </div>
              <button
                type="button"
                onClick={handleResetTransform}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
              >
                Reset Transform
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleToggleMirror(false)}
                className={`py-2 rounded-xl text-xs font-semibold border transition ${
                  !videoTransform.mirror
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 ring-1 ring-sky-500/40'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                [ Normal Video ]
              </button>

              <button
                type="button"
                onClick={() => handleToggleMirror(true)}
                className={`py-2 rounded-xl text-xs font-semibold border transition ${
                  videoTransform.mirror
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg font-bold'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                [ Mirror Horizontally (hflip) ]
              </button>
            </div>

            <p className="text-[11px] text-zinc-400">
              Flips the video left-to-right (horizontal mirror). Immediately visible in preview and applied during final MP4 export.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
