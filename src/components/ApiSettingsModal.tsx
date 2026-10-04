import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, Check, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../services/apiClient.ts';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(inputKey);
    onClose();
  };

  const handleTest = async () => {
    const keyToTest = inputKey.trim();
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Please enter a Gemini API key before testing.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await ApiClient.testApiKey(keyToTest);
      setTestResult(res);
      if (res.success) {
        onSaveKey(keyToTest);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-zinc-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Gemini API Settings</h3>
            <p className="text-xs text-zinc-400">
              Required for AI audio transcription & chronological recap scriptwriting
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="mb-5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start space-x-2.5 text-xs text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p>
            Your API key is stored safely on the client side and passed securely through server-side proxy routes.
            It is never hardcoded or publicly exposed.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Gemini API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="AIzaSy..."
              className="w-full pl-3.5 pr-10 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                testResult.success
                  ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                  : 'bg-red-950/40 border border-red-800 text-red-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !inputKey.trim()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-50 transition"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{isTesting ? 'Testing Key...' : 'Test API Key'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition"
            >
              Save API Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
