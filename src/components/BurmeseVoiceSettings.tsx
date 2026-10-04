import React, { useState } from 'react';
import { Mic, Volume2, Gauge, Play, Loader2, Sparkles, CheckCircle2, RotateCw } from 'lucide-react';
import { VoiceSettingsConfig, RecapSegment } from '../types/index.ts';

interface BurmeseVoiceSettingsProps {
  settings: VoiceSettingsConfig;
  onChangeSettings: (settings: VoiceSettingsConfig) => void;
  onGenerateAllVoices: () => void;
  isGeneratingAll: boolean;
  totalSegments: number;
  generatedCount: number;
}

export const BurmeseVoiceSettings: React.FC<BurmeseVoiceSettingsProps> = ({
  settings,
  onChangeSettings,
  onGenerateAllVoices,
  isGeneratingAll,
  totalSegments,
  generatedCount
}) => {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const updateSetting = <K extends keyof VoiceSettingsConfig>(
    field: K,
    val: VoiceSettingsConfig[K]
  ) => {
    onChangeSettings({
      ...settings,
      [field]: val
    });
  };

  const handleTestPreview = async () => {
    setIsPreviewing(true);
    try {
      // Test phrase in Burmese with English name translation
      const sampleText = 'မင်္ဂလာပါ ဂျွန် က အခန်းထဲကို တိတ်တဆိတ် ဝင်လာပါတယ်။';
      const res = await fetch('/api/preview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: {
            id: 'sample',
            burmese_recap: sampleText,
            start: 0,
            end: 4
          },
          voiceSettings: settings
        })
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        if (previewAudio) {
          previewAudio.pause();
        }
        const audio = new Audio(data.audioUrl);
        setPreviewAudio(audio);
        audio.play().catch(() => {});
        audio.onended = () => setIsPreviewing(false);
      } else {
        alert(data.error || 'Failed to generate voice preview.');
        setIsPreviewing(false);
      }
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
      setIsPreviewing(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Edge TTS Burmese Voice Engine</h4>
            <p className="text-xs text-zinc-400">
              High-fidelity neural voices with automatic timing synchronization
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {generatedCount}/{totalSegments} Voiced
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Voice Selector */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
            Voice Persona (Burmese)
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => updateSetting('voice', 'my-MM-NilarNeural')}
              className={`p-3 rounded-xl border text-left transition ${
                settings.voice === 'my-MM-NilarNeural'
                  ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/40'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-zinc-100">Nilar (Female)</span>
                <span className="text-[10px] font-semibold text-purple-400 uppercase">Default</span>
              </div>
              <p className="text-[11px] text-zinc-400">Natural clear recap narrator</p>
            </button>

            <button
              type="button"
              onClick={() => updateSetting('voice', 'my-MM-ThihaNeural')}
              className={`p-3 rounded-xl border text-left transition ${
                settings.voice === 'my-MM-ThihaNeural'
                  ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/40'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-zinc-100">Thiha (Male)</span>
                <span className="text-[10px] font-semibold text-purple-400 uppercase">Deep</span>
              </div>
              <p className="text-[11px] text-zinc-400">Cinematic story tone</p>
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 font-medium">Narration Speed</span>
              <span className="font-mono text-purple-400 font-bold">{settings.speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.8}
              max={2.0}
              step={0.1}
              value={settings.speed}
              onChange={(e) => updateSetting('speed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0.8x</span>
              <span>1.0x (Normal)</span>
              <span>1.5x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 font-medium">Voice Volume</span>
              <span className="font-mono text-purple-400 font-bold">{settings.volume}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={settings.volume}
              onChange={(e) => updateSetting('volume', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>Low</span>
              <span>Medium</span>
              <span>Max (100%)</span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleTestPreview}
            disabled={isPreviewing}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center space-x-1.5 disabled:opacity-50 transition"
          >
            {isPreviewing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current text-purple-400" />
            )}
            <span>{isPreviewing ? 'Synthesizing...' : 'Preview Voice Sample'}</span>
          </button>

          <button
            type="button"
            onClick={onGenerateAllVoices}
            disabled={isGeneratingAll || totalSegments === 0}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 transition"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Segment Voices...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Generate All Narration Audio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
