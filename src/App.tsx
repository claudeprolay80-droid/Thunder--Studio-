import React, { useState, useEffect } from 'react';
import {
  Header
} from './components/Header.tsx';
import {
  ApiSettingsModal
} from './components/ApiSettingsModal.tsx';
import {
  PipelineStepper
} from './components/PipelineStepper.tsx';
import {
  VideoUploader
} from './components/VideoUploader.tsx';
import {
  VideoPlayer
} from './components/VideoPlayer.tsx';
import {
  BlurBoxControls
} from './components/BlurBoxControls.tsx';
import {
  TranscriptViewer
} from './components/TranscriptViewer.tsx';
import {
  RecapScriptViewer
} from './components/RecapScriptViewer.tsx';
import {
  BurmeseVoiceSettings
} from './components/BurmeseVoiceSettings.tsx';
import {
  SubtitleStyleEditor
} from './components/SubtitleStyleEditor.tsx';
import {
  VideoEditorPanel
} from './components/VideoEditorPanel.tsx';
import {
  RenderExportModal
} from './components/RenderExportModal.tsx';
import {
  StatusBanner
} from './components/StatusBanner.tsx';
import {
  ApiClient
} from './services/apiClient.ts';
import {
  VideoMetadata,
  TranscriptSegment,
  RecapSegment,
  SubtitleChunk,
  BlurBoxConfig,
  SubtitleStyleConfig,
  VoiceSettingsConfig,
  PipelineStepId,
  StepStatus,
  AudioSettings,
  VideoTransformConfig,
  CropConfig
} from './types/index.ts';
import {
  Play,
  Film,
  Sparkles,
  FileText,
  Subtitles,
  Mic,
  EyeOff,
  Sliders,
  RotateCcw,
  CheckCircle2,
  Video,
  Crop,
  Volume2
} from 'lucide-react';

const INITIAL_STEPS: StepStatus[] = [
  { id: 'upload', label: 'Upload Video', status: 'pending' },
  { id: 'extract-audio', label: 'Extract Audio', status: 'pending' },
  { id: 'transcript', label: 'AI Transcript', status: 'pending' },
  { id: 'recap', label: 'Recap Script', status: 'pending' },
  { id: 'translate', label: 'Myanmar Style', status: 'pending' },
  { id: 'voice', label: 'Burmese Voice', status: 'pending' },
  { id: 'subtitles', label: 'Subtitles', status: 'pending' },
  { id: 'blur', label: 'Subtitle Blur', status: 'pending' },
  { id: 'render', label: 'Render Video', status: 'pending' },
  { id: 'complete', label: 'Complete', status: 'pending' }
];

export default function App() {
  // Settings & Keys
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // Video state
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioFilename, setAudioFilename] = useState<string | null>(null);

  // Pipeline state
  const [pipelineSteps, setPipelineSteps] = useState<StepStatus[]>(INITIAL_STEPS);
  const [currentStepId, setCurrentStepId] = useState<PipelineStepId>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Generated AI Data
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [recapSegments, setRecapSegments] = useState<RecapSegment[]>([]);
  const [subtitleChunks, setSubtitleChunks] = useState<SubtitleChunk[]>([]);

  // Subtitle blur box config
  const [blurBox, setBlurBox] = useState<BlurBoxConfig>({
    enabled: true,
    xPercent: 10,
    yPercent: 78,
    widthPercent: 80,
    heightPercent: 16,
    strength: 24
  });

  // Subtitle style config (default 36px, centered bottom with outline & shadow)
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleConfig>({
    fontSize: 36,
    textColor: '#FFFFFF',
    bgColor: '#000000',
    bgOpacity: 0.75,
    horizontalAlign: 'center',
    verticalPosition: 'bottom',
    yOffsetPercent: 8,
    outline: true,
    shadow: true,
    fontFamily: 'Noto Sans Myanmar'
  });

  // Audio mix settings (independent Original Video vs Burmese Recap Voice)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    originalVolume: 1.0, // 100%
    voiceVolume: 1.0,    // 100%
    originalMuted: false
  });

  // Video transform settings (Crop & Mirror)
  const [videoTransform, setVideoTransform] = useState<VideoTransformConfig>({
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

  const [isCropToolActive, setIsCropToolActive] = useState(false);

  // Burmese Edge TTS settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsConfig>({
    voice: 'my-MM-NilarNeural',
    speed: 1.0,
    volume: 100,
    pitch: 0
  });

  // Player & UI Tab state
  const [activeTab, setActiveTab] = useState<'editor' | 'recap' | 'subtitles' | 'voice' | 'transcript'>('editor');
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);

  // Render & Export Modal
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string | null>(null);
  const [outputSizeBytes, setOutputSizeBytes] = useState(0);

  // Load API key from local storage on mount
  useEffect(() => {
    const saved = ApiClient.getStoredApiKey();
    if (saved) {
      setApiKey(saved);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    ApiClient.setStoredApiKey(key);
  };

  const updateStepStatus = (id: PipelineStepId, status: StepStatus['status'], progress?: number, err?: string) => {
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, progress, error: err } : s))
    );
    if (status === 'in_progress') {
      setCurrentStepId(id);
    }
  };

  // 1. Upload Video Handler
  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage('');
    updateStepStatus('upload', 'in_progress', 10);

    try {
      const meta = await ApiClient.uploadVideo(file, (pct) => setUploadProgress(pct));
      setMetadata(meta);
      updateStepStatus('upload', 'completed');
      setStatusMessage(`Uploaded ${meta.originalName} (${meta.width}x${meta.height}, ${meta.durationSeconds}s)`);
    } catch (err: any) {
      setErrorMessage(`Upload failed: ${err.message}`);
      updateStepStatus('upload', 'error', 0, err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Load Demo Video Handler
  const handleLoadDemo = async () => {
    setIsUploading(true);
    setErrorMessage('');
    setStatusMessage('Generating dramatic demo scene video in backend...');

    try {
      const meta = await ApiClient.loadDemoVideo();
      setMetadata(meta);
      updateStepStatus('upload', 'completed');
      setStatusMessage('Demo scene loaded successfully! Ready to start recap.');
    } catch (err: any) {
      setErrorMessage(`Failed to load demo scene: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    setMetadata(null);
    setAudioFilename(null);
    setTranscriptSegments([]);
    setRecapSegments([]);
    setSubtitleChunks([]);
    setPipelineSteps(INITIAL_STEPS);
    setCurrentStepId('upload');
    setRenderedVideoUrl(null);
    setStatusMessage('');
    setErrorMessage('');
  };

  // Reset All Editor Settings (Section 23)
  const handleResetAllEditorSettings = () => {
    setAudioSettings({
      originalVolume: 1.0,
      voiceVolume: 1.0,
      originalMuted: false
    });
    setSubtitleStyle({
      fontSize: 36,
      textColor: '#FFFFFF',
      bgColor: '#000000',
      bgOpacity: 0.75,
      horizontalAlign: 'center',
      verticalPosition: 'bottom',
      yOffsetPercent: 8,
      outline: true,
      shadow: true,
      fontFamily: 'Noto Sans Myanmar'
    });
    setVideoTransform({
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
    setIsCropToolActive(false);
    setStatusMessage('All video editor settings (volumes, subtitles, crop, mirror) restored to defaults.');
  };

  // 3. Full Movie Recap Workflow Runner
  const handleStartRecap = async () => {
    if (!metadata) return;
    if (!apiKey.trim()) {
      setIsApiModalOpen(true);
      setErrorMessage('Please configure your Gemini API Key in Settings to begin.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    const jobId = `job_${Date.now()}`;

    try {
      // Step A: Extract Audio
      updateStepStatus('extract-audio', 'in_progress', 30);
      setStatusMessage('Extracting movie audio track using FFmpeg...');
      const audioResult = await ApiClient.extractAudio(metadata.filename, jobId);
      setAudioFilename(audioResult.audioFilename);
      updateStepStatus('extract-audio', 'completed');

      // Step B: Generate Transcript
      updateStepStatus('transcript', 'in_progress', 50);
      setStatusMessage('Listening and generating chronological AI transcript via Gemini...');
      const transcript = await ApiClient.generateTranscript(
        audioResult.audioFilename,
        apiKey,
        metadata.durationSeconds,
        jobId
      );
      setTranscriptSegments(transcript);
      updateStepStatus('transcript', 'completed');

      // Step C & D: Generate Chronological Recap + Burmese Spoken Translation + Pronunciation Mapping
      updateStepStatus('recap', 'in_progress', 70);
      updateStepStatus('translate', 'in_progress', 70);
      setStatusMessage('Composing Burmese movie recap script and phonetically transcribing English terms...');
      const recapResult = await ApiClient.generateRecap(
        transcript,
        apiKey,
        metadata.durationSeconds,
        jobId
      );
      setRecapSegments(recapResult.recapSegments);
      setSubtitleChunks(recapResult.subtitleChunks);
      updateStepStatus('recap', 'completed');
      updateStepStatus('translate', 'completed');
      updateStepStatus('subtitles', 'completed');

      // Step E: Generate Edge TTS Burmese Voices
      updateStepStatus('voice', 'in_progress', 80);
      setStatusMessage('Synthesizing natural Burmese narration voice with Edge TTS...');
      const voicedSegments = await ApiClient.generateVoiceAll(
        recapResult.recapSegments,
        voiceSettings,
        jobId
      );
      setRecapSegments(voicedSegments);
      updateStepStatus('voice', 'completed');

      // Subtitle Blur ready
      updateStepStatus('blur', 'completed');

      setStatusMessage('Burmese movie recap generated! You can preview, adjust audio/subtitles/crop in Video Editor, and render MP4.');
      setActiveTab('editor');
    } catch (err: any) {
      setErrorMessage(err.message || 'Processing failed.');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'error', error: err.message } : s))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Step Retry handler
  const handleRetryStep = async (stepId: PipelineStepId) => {
    if (!metadata) return;

    setIsProcessing(true);
    setErrorMessage('');
    const jobId = `job_retry_${Date.now()}`;

    try {
      if (stepId === 'extract-audio') {
        updateStepStatus('extract-audio', 'in_progress', 40);
        const res = await ApiClient.extractAudio(metadata.filename, jobId);
        setAudioFilename(res.audioFilename);
        updateStepStatus('extract-audio', 'completed');
      } else if (stepId === 'transcript') {
        if (!audioFilename) throw new Error('Audio file missing. Please retry Extract Audio first.');
        updateStepStatus('transcript', 'in_progress', 50);
        const trans = await ApiClient.generateTranscript(audioFilename, apiKey, metadata.durationSeconds, jobId);
        setTranscriptSegments(trans);
        updateStepStatus('transcript', 'completed');
      } else if (stepId === 'recap' || stepId === 'translate') {
        if (transcriptSegments.length === 0) throw new Error('Transcript missing. Please run transcript first.');
        updateStepStatus('recap', 'in_progress', 70);
        const recapRes = await ApiClient.generateRecap(transcriptSegments, apiKey, metadata.durationSeconds, jobId);
        setRecapSegments(recapRes.recapSegments);
        setSubtitleChunks(recapRes.subtitleChunks);
        updateStepStatus('recap', 'completed');
        updateStepStatus('translate', 'completed');
      } else if (stepId === 'voice') {
        if (recapSegments.length === 0) throw new Error('Recap segments missing. Generate recap first.');
        updateStepStatus('voice', 'in_progress', 80);
        const voiced = await ApiClient.generateVoiceAll(recapSegments, voiceSettings, jobId);
        setRecapSegments(voiced);
        updateStepStatus('voice', 'completed');
      } else if (stepId === 'render') {
        handleRenderFinalVideo();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      updateStepStatus(stepId, 'error', 0, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate / Retry Voice for individual segment
  const handleRegenerateVoiceForSegment = async (segment: RecapSegment) => {
    setRecapSegments((prev) =>
      prev.map((s) => (s.id === segment.id ? { ...s, isGeneratingAudio: true } : s))
    );

    try {
      const res = await ApiClient.generateVoiceSegment(segment, voiceSettings);
      setRecapSegments((prev) =>
        prev.map((s) =>
          s.id === segment.id
            ? {
                ...s,
                audioUrl: res.audioUrl,
                audioDuration: res.audioDuration,
                speedAdjustment: res.speedAdjustment,
                isGeneratingAudio: false
              }
            : s
        )
      );
    } catch (err: any) {
      alert(`Voice generation failed for segment: ${err.message}`);
      setRecapSegments((prev) =>
        prev.map((s) => (s.id === segment.id ? { ...s, isGeneratingAudio: false } : s))
      );
    }
  };

  // Generate All Segment Voices button
  const handleGenerateAllVoices = async () => {
    if (recapSegments.length === 0) return;
    setIsProcessing(true);
    const jobId = `job_voice_${Date.now()}`;
    updateStepStatus('voice', 'in_progress', 50);

    try {
      const voiced = await ApiClient.generateVoiceAll(recapSegments, voiceSettings, jobId);
      setRecapSegments(voiced);
      updateStepStatus('voice', 'completed');
      setStatusMessage('Generated Edge TTS narration audio for all segments!');
    } catch (err: any) {
      setErrorMessage(`Voice generation failed: ${err.message}`);
      updateStepStatus('voice', 'error', 0, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Recalculate Subtitle Chunks from current Recap script
  const handleRecalculateChunks = async () => {
    if (recapSegments.length === 0) return;
    try {
      const chunks = await ApiClient.recalculateSubtitles(recapSegments);
      setSubtitleChunks(chunks);
      setStatusMessage('Recalculated 2–6 word Burmese subtitle chunks!');
    } catch (err: any) {
      setErrorMessage(`Rechunking failed: ${err.message}`);
    }
  };

  // Render Final Video with FFmpeg (using crop, mirror, blur box, Burmese subtitles, and audio mixing)
  const handleRenderFinalVideo = async () => {
    if (!metadata) return;

    setIsRenderModalOpen(true);
    setIsRendering(true);
    setRenderProgress(10);
    setErrorMessage('');
    updateStepStatus('render', 'in_progress', 10);

    const jobId = `render_${Date.now()}`;

    try {
      const result = await ApiClient.renderFinalVideo({
        videoFilename: metadata.filename,
        recapSegments,
        subtitles: subtitleChunks,
        blurBox,
        subtitleStyle,
        videoTransform,
        audioSettings,
        videoDuration: metadata.durationSeconds,
        jobId
      });

      setRenderedVideoUrl(result.renderedUrl);
      setOutputFilename(result.outputFilename);
      setOutputSizeBytes(result.sizeBytes);
      setRenderProgress(100);
      updateStepStatus('render', 'completed');
      updateStepStatus('complete', 'completed');
      setCurrentStepId('complete');
    } catch (err: any) {
      setErrorMessage(`Final rendering failed: ${err.message}`);
      updateStepStatus('render', 'error', 0, err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const voicedCount = recapSegments.filter((s) => !!s.audioUrl).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header */}
      <Header
        hasApiKey={!!apiKey.trim()}
        onOpenApiSettings={() => setIsApiModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        isLoadingDemo={isUploading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status / Error Alerts */}
        <StatusBanner
          statusText={statusMessage}
          errorText={errorMessage}
          onClearError={() => setErrorMessage('')}
          onRetry={() => handleRetryStep(currentStepId)}
          isProcessing={isProcessing}
        />

        {/* Processing Pipeline Stepper */}
        <PipelineStepper
          steps={pipelineSteps}
          currentStepId={currentStepId}
          onRetryStep={handleRetryStep}
        />

        {/* Video Upload & Metadata Section */}
        <VideoUploader
          metadata={metadata}
          onFileSelect={handleFileSelect}
          onRemoveVideo={handleRemoveVideo}
          onStartRecap={handleStartRecap}
          onLoadDemo={handleLoadDemo}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          isProcessing={isProcessing}
          hasApiKey={!!apiKey.trim()}
          onOpenApiKeyModal={() => setIsApiModalOpen(true)}
        />

        {/* Main Studio Editor Workspace (visible when video is loaded) */}
        {metadata && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Live Video Player & Live Controls (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-5">
              <VideoPlayer
                videoUrl={metadata.videoUrl}
                durationSeconds={metadata.durationSeconds}
                subtitles={subtitleChunks}
                recapSegments={recapSegments}
                blurBox={blurBox}
                subtitleStyle={subtitleStyle}
                audioSettings={audioSettings}
                videoTransform={videoTransform}
                onChangeCrop={(crop: CropConfig) => setVideoTransform({ ...videoTransform, crop })}
                isCropToolActive={isCropToolActive}
                videoWidth={metadata.width}
                videoHeight={metadata.height}
                onTimeUpdate={(t) => setCurrentTime(t)}
                externalCurrentTime={seekTime}
              />

              {/* Render Final Export Action Banner */}
              <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-zinc-100">Ready to Render Movie Recap?</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      MP4 EXPORT
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    FFmpeg will apply video crop, mirror transform, blur mask, Burmese subtitles, and mix audio tracks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRenderFinalVideo}
                  disabled={isProcessing || recapSegments.length === 0}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 transition"
                >
                  <Film className="w-4 h-4 fill-zinc-950" />
                  <span>Render Final Video</span>
                </button>
              </div>

              {/* Blur Box Quick Controls */}
              <BlurBoxControls config={blurBox} onChange={setBlurBox} />
            </div>

            {/* Right Column: Video Editor Suite & Script Studio Tabs (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Studio Tabs Navigation */}
              <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeTab === 'editor'
                      ? 'bg-amber-500 text-zinc-950 shadow font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Video Editor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('recap')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeTab === 'recap'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Burmese Recap ({recapSegments.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('subtitles')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeTab === 'subtitles'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Subtitles className="w-3.5 h-3.5" />
                  <span>Subtitles ({subtitleChunks.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('voice')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeTab === 'voice'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Edge Voice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('transcript')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeTab === 'transcript'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Transcript</span>
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'editor' && (
                <VideoEditorPanel
                  audioSettings={audioSettings}
                  onChangeAudio={setAudioSettings}
                  subtitleStyle={subtitleStyle}
                  onChangeSubtitleStyle={setSubtitleStyle}
                  videoTransform={videoTransform}
                  onChangeTransform={setVideoTransform}
                  onResetAllSettings={handleResetAllEditorSettings}
                  videoWidth={metadata.width}
                  videoHeight={metadata.height}
                  isCropToolActive={isCropToolActive}
                  onToggleCropTool={() => setIsCropToolActive(!isCropToolActive)}
                />
              )}

              {activeTab === 'recap' && (
                <RecapScriptViewer
                  segments={recapSegments}
                  onUpdateSegments={setRecapSegments}
                  onRegenerateVoiceForSegment={handleRegenerateVoiceForSegment}
                  onSeekTo={(t) => setSeekTime(t)}
                  currentTime={currentTime}
                />
              )}

              {activeTab === 'subtitles' && (
                <SubtitleStyleEditor
                  subtitles={subtitleChunks}
                  style={subtitleStyle}
                  onChangeStyle={setSubtitleStyle}
                  onUpdateSubtitles={setSubtitleChunks}
                  onRecalculateChunks={handleRecalculateChunks}
                  onSeekTo={(t) => setSeekTime(t)}
                  currentTime={currentTime}
                />
              )}

              {activeTab === 'voice' && (
                <BurmeseVoiceSettings
                  settings={voiceSettings}
                  onChangeSettings={setVoiceSettings}
                  onGenerateAllVoices={handleGenerateAllVoices}
                  isGeneratingAll={isProcessing}
                  totalSegments={recapSegments.length}
                  generatedCount={voicedCount}
                />
              )}

              {activeTab === 'transcript' && (
                <TranscriptViewer
                  segments={transcriptSegments}
                  onUpdateSegments={setTranscriptSegments}
                  onSeekTo={(t) => setSeekTime(t)}
                  currentTime={currentTime}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Render & Export Modal */}
      <RenderExportModal
        isOpen={isRenderModalOpen}
        onClose={() => setIsRenderModalOpen(false)}
        isRendering={isRendering}
        renderProgress={renderProgress}
        renderedVideoUrl={renderedVideoUrl}
        outputFilename={outputFilename}
        outputSizeBytes={outputSizeBytes}
        metadata={metadata}
        onRestartNewRecap={handleRemoveVideo}
      />

      {/* API Key Modal */}
      <ApiSettingsModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveApiKey}
      />
    </div>
  );
}
