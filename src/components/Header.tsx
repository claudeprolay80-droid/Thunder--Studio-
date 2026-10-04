import React from 'react';
import { Zap, Key, Video, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  hasApiKey: boolean;
  onOpenApiSettings: () => void;
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  hasApiKey,
  onOpenApiSettings,
  onLoadDemo,
  isLoadingDemo
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Zap className="w-6 h-6 text-zinc-950 fill-zinc-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">Thunder ⚡-Studio</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO RECAP
              </span>
            </div>
            <p className="text-xs text-zinc-400">AI Burmese Movie Recap & Narration Studio</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Demo Button */}
          <button
            type="button"
            onClick={onLoadDemo}
            disabled={isLoadingDemo}
            className="hidden sm:inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
            title="Load a 12-second test scene to try the full pipeline"
          >
            <Video className="w-4 h-4 text-amber-400" />
            <span>{isLoadingDemo ? 'Generating Demo...' : 'Try Demo Scene'}</span>
          </button>

          {/* API Key Status / Button */}
          <button
            type="button"
            onClick={onOpenApiSettings}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition border ${
              hasApiKey
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Gemini Key</span>
            {hasApiKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 ml-1" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
