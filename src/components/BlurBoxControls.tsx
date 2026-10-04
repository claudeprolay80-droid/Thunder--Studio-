import React from 'react';
import { EyeOff, Eye, Sliders, ShieldAlert, Sparkles } from 'lucide-react';
import { BlurBoxConfig } from '../types/index.ts';

interface BlurBoxControlsProps {
  config: BlurBoxConfig;
  onChange: (newConfig: BlurBoxConfig) => void;
}

export const BlurBoxControls: React.FC<BlurBoxControlsProps> = ({ config, onChange }) => {
  const updateField = <K extends keyof BlurBoxConfig>(field: K, value: BlurBoxConfig[K]) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  const applyPreset = (preset: 'bottom-center' | 'bottom-wide' | 'bottom-thin') => {
    if (preset === 'bottom-center') {
      onChange({
        ...config,
        enabled: true,
        xPercent: 10,
        yPercent: 78,
        widthPercent: 80,
        heightPercent: 16,
        strength: 24
      });
    } else if (preset === 'bottom-wide') {
      onChange({
        ...config,
        enabled: true,
        xPercent: 0,
        yPercent: 75,
        widthPercent: 100,
        heightPercent: 22,
        strength: 28
      });
    } else if (preset === 'bottom-thin') {
      onChange({
        ...config,
        enabled: true,
        xPercent: 15,
        yPercent: 82,
        widthPercent: 70,
        heightPercent: 12,
        strength: 20
      });
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Original Subtitle Blur Box</h4>
            <p className="text-xs text-zinc-400">
              Blurs burned-in or hardcoded subtitles so they don't clash with Burmese recap
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => updateField('enabled', !config.enabled)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
            config.enabled
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
          }`}
        >
          {config.enabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{config.enabled ? 'Blur Active' : 'Blur Disabled'}</span>
        </button>
      </div>

      {config.enabled ? (
        <div className="space-y-4">
          {/* Quick Presets */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset('bottom-center')}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition"
            >
              Bottom Centered
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bottom-wide')}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition"
            >
              Full Width Banner
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bottom-thin')}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition"
            >
              Compact
            </button>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Y Position */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">Vertical Position (Y)</span>
                <span className="font-mono text-amber-400 font-bold">{config.yPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                value={config.yPercent}
                onChange={(e) => updateField('yPercent', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Height */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">Box Height</span>
                <span className="font-mono text-amber-400 font-bold">{config.heightPercent}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={40}
                value={config.heightPercent}
                onChange={(e) => updateField('heightPercent', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* X Position */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">Horizontal Position (X)</span>
                <span className="font-mono text-amber-400 font-bold">{config.xPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                value={config.xPercent}
                onChange={(e) => updateField('xPercent', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Width */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">Box Width</span>
                <span className="font-mono text-amber-400 font-bold">{config.widthPercent}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={config.widthPercent}
                onChange={(e) => updateField('widthPercent', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Blur Strength */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">Blur Strength / Radius</span>
                <span className="font-mono text-amber-400 font-bold">{config.strength} px</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                value={config.strength}
                onChange={(e) => updateField('strength', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 italic py-2">
          Blur mask is disabled. Original video pixels in the subtitle region will be left untouched.
        </p>
      )}
    </div>
  );
};
