import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { VideoService } from '../services/videoService.ts';
import { GeminiService } from '../services/geminiService.ts';
import { TTSService } from '../services/ttsService.ts';
import {
  BlurBoxConfig,
  SubtitleStyleConfig,
  VoiceSettingsConfig,
  RecapSegment,
  SubtitleChunk,
  TranscriptSegment
} from '../../src/types/index.ts';

const router = express.Router();

const UPLOADS_DIR = path.resolve('uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
const OUTPUT_DIR = path.resolve('output');
const RENDERED_DIR = path.join(OUTPUT_DIR, 'rendered');
const TTS_AUDIO_DIR = path.join(OUTPUT_DIR, 'tts');

// Ensure directories exist
[VIDEOS_DIR, AUDIO_DIR, RENDERED_DIR, TTS_AUDIO_DIR].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

// Multer storage setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, VIDEOS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const uniqueName = `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp4|mkv|mov|avi|webm)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Allowed: MP4, MKV, MOV, AVI, WebM'));
    }
  }
});

// In-memory progress tracking
const jobProgress: Record<string, { percent: number; status: string; error?: string }> = {};

/**
 * 1. Test Gemini API Key
 */
router.post('/settings/test-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API key is required.' });
    }
    const result = await GeminiService.testApiKey(apiKey);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 2. Upload video file
 */
router.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const filePath = req.file.path;
    const videoUrl = `/api/media/videos/${req.file.filename}`;

    const metadata = await VideoService.getVideoMetadata(
      filePath,
      req.file.originalname,
      videoUrl
    );

    return res.json({ success: true, metadata });
  } catch (err: any) {
    return res.status(500).json({ error: `Upload error: ${err.message}` });
  }
});

/**
 * 3. Generate sample demo video
 */
router.post('/sample-demo', async (_req: Request, res: Response) => {
  try {
    const filename = `demo_${Date.now()}.mp4`;
    const outputPath = path.join(VIDEOS_DIR, filename);

    await VideoService.createSampleDemoVideo(outputPath);
    const videoUrl = `/api/media/videos/${filename}`;

    const metadata = await VideoService.getVideoMetadata(
      outputPath,
      'thunder_demo_scene.mp4',
      videoUrl
    );

    return res.json({ success: true, metadata });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to create demo video: ${err.message}` });
  }
});

/**
 * 4. Extract audio
 */
router.post('/extract-audio', async (req: Request, res: Response) => {
  try {
    const { filename, jobId } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const videoPath = path.join(VIDEOS_DIR, filename);
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const audioFilename = `${path.parse(filename).name}_audio.mp3`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);

    if (jobId) {
      jobProgress[jobId] = { percent: 10, status: 'Extracting audio...' };
    }

    await VideoService.extractAudio(videoPath, audioPath, (prog) => {
      if (jobId) {
        jobProgress[jobId] = { percent: prog, status: 'Extracting audio...' };
      }
    });

    if (jobId) {
      jobProgress[jobId] = { percent: 100, status: 'Audio extraction complete' };
    }

    const audioUrl = `/api/media/audio/${audioFilename}`;
    return res.json({
      success: true,
      audioFilename,
      audioUrl
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Audio extraction failed: ${err.message}` });
  }
});

/**
 * 5. Generate transcript using Gemini AI
 */
router.post('/generate-transcript', async (req: Request, res: Response) => {
  try {
    const { audioFilename, apiKey, videoDuration, jobId } = req.body;
    if (!audioFilename) {
      return res.status(400).json({ error: 'audioFilename is required' });
    }

    const audioPath = path.join(AUDIO_DIR, audioFilename);
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    if (jobId) {
      jobProgress[jobId] = { percent: 30, status: 'Generating chronological AI transcript...' };
    }

    const segments = await GeminiService.generateTranscript(audioPath, apiKey, videoDuration);

    if (jobId) {
      jobProgress[jobId] = { percent: 100, status: 'Transcript generated' };
    }

    return res.json({ success: true, segments });
  } catch (err: any) {
    if (req.body.jobId) {
      jobProgress[req.body.jobId] = { percent: 0, status: 'Error', error: err.message };
    }
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Generate chronological recap & Burmese translation with pronunciation conversion
 */
router.post('/generate-recap', async (req: Request, res: Response) => {
  try {
    const { transcriptSegments, apiKey, videoDuration, jobId } = req.body;
    if (!transcriptSegments || !Array.isArray(transcriptSegments)) {
      return res.status(400).json({ error: 'transcriptSegments array is required' });
    }

    if (jobId) {
      jobProgress[jobId] = { percent: 40, status: 'Writing time-aligned Burmese recap script...' };
    }

    const recapSegments = await GeminiService.generateRecap(transcriptSegments, apiKey, videoDuration);
    const subtitleChunks = GeminiService.chunkSubtitlesForRecap(recapSegments);

    if (jobId) {
      jobProgress[jobId] = { percent: 100, status: 'Recap script & subtitles ready' };
    }

    return res.json({ success: true, recapSegments, subtitleChunks });
  } catch (err: any) {
    if (req.body.jobId) {
      jobProgress[req.body.jobId] = { percent: 0, status: 'Error', error: err.message };
    }
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 7. Generate Edge TTS Burmese voice for all recap segments
 */
router.post('/generate-voice-all', async (req: Request, res: Response) => {
  try {
    const { recapSegments, voiceSettings, jobId } = req.body;
    if (!recapSegments || !Array.isArray(recapSegments)) {
      return res.status(400).json({ error: 'recapSegments array is required' });
    }

    const settings: VoiceSettingsConfig = voiceSettings || {
      voice: 'my-MM-NilarNeural',
      speed: 1.0,
      volume: 100,
      pitch: 0
    };

    const updatedSegments: RecapSegment[] = [];
    const total = recapSegments.length;

    for (let i = 0; i < total; i++) {
      const seg = recapSegments[i];
      if (jobId) {
        const pct = Math.round(((i + 1) / total) * 100);
        jobProgress[jobId] = {
          percent: pct,
          status: `Generating Edge TTS Burmese Voice segment ${i + 1} of ${total}...`
        };
      }

      try {
        const generated = await TTSService.generateSegmentAudio({
          segmentId: seg.id || `seg_${i}`,
          burmeseText: seg.burmese_recap,
          start: seg.start,
          end: seg.end,
          voiceSettings: settings,
          outputDir: TTS_AUDIO_DIR
        });

        updatedSegments.push({
          ...seg,
          audioUrl: `/api/media/tts/${generated.filename}`,
          audioDuration: generated.duration,
          speedAdjustment: generated.speedApplied
        });
      } catch (voiceErr: any) {
        console.error(`Error generating voice for segment ${i}:`, voiceErr.message);
        updatedSegments.push({
          ...seg,
          audioUrl: undefined
        });
      }
    }

    if (jobId) {
      jobProgress[jobId] = { percent: 100, status: 'Burmese narration voice generation complete' };
    }

    return res.json({ success: true, recapSegments: updatedSegments });
  } catch (err: any) {
    if (req.body.jobId) {
      jobProgress[req.body.jobId] = { percent: 0, status: 'Error', error: err.message };
    }
    return res.status(500).json({ error: `Edge TTS Burmese voice generation failed: ${err.message}` });
  }
});

/**
 * 8. Generate Edge TTS voice for a single segment (retry / live edit)
 */
router.post('/generate-voice-segment', async (req: Request, res: Response) => {
  try {
    const { segment, voiceSettings } = req.body;
    if (!segment || !segment.burmese_recap) {
      return res.status(400).json({ error: 'segment with burmese_recap is required' });
    }

    const settings: VoiceSettingsConfig = voiceSettings || {
      voice: 'my-MM-NilarNeural',
      speed: 1.0,
      volume: 100,
      pitch: 0
    };

    const generated = await TTSService.generateSegmentAudio({
      segmentId: segment.id || 'single',
      burmeseText: segment.burmese_recap,
      start: segment.start,
      end: segment.end,
      voiceSettings: settings,
      outputDir: TTS_AUDIO_DIR
    });

    return res.json({
      success: true,
      audioUrl: `/api/media/tts/${generated.filename}`,
      audioDuration: generated.duration,
      speedAdjustment: generated.speedApplied
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Single voice generation failed: ${err.message}` });
  }
});

/**
 * 9. Subtitle chunking recalculation
 */
router.post('/chunk-subtitles', (req: Request, res: Response) => {
  try {
    const { recapSegments } = req.body;
    if (!recapSegments || !Array.isArray(recapSegments)) {
      return res.status(400).json({ error: 'recapSegments array required' });
    }
    const chunks = GeminiService.chunkSubtitlesForRecap(recapSegments);
    return res.json({ success: true, subtitleChunks: chunks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 10. Render final video with FFmpeg:
 * (original video + blur box mask + Burmese subtitles + mixed TTS voice narration)
 */
router.post('/render-video', async (req: Request, res: Response) => {
  try {
    const {
      videoFilename,
      recapSegments,
      subtitles,
      blurBox,
      subtitleStyle,
      videoDuration,
      jobId
    } = req.body;

    if (!videoFilename) {
      return res.status(400).json({ error: 'videoFilename is required' });
    }

    const videoPath = path.join(VIDEOS_DIR, videoFilename);
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Map audio segments that have generated audio
    const audioSegmentsList: { start: number; filePath: string }[] = [];
    if (Array.isArray(recapSegments)) {
      for (const seg of recapSegments) {
        if (seg.audioUrl) {
          const baseName = path.basename(seg.audioUrl);
          const fullAudioPath = path.join(TTS_AUDIO_DIR, baseName);
          if (fs.existsSync(fullAudioPath)) {
            audioSegmentsList.push({
              start: seg.start,
              filePath: fullAudioPath
            });
          }
        }
      }
    }

    const outputFilename = `thunder-recap-final-${Date.now()}.mp4`;
    const outputPath = path.join(RENDERED_DIR, outputFilename);

    if (jobId) {
      jobProgress[jobId] = { percent: 5, status: 'Initializing final video rendering...' };
    }

    await VideoService.renderFinalVideo({
      videoPath,
      audioSegments: audioSegmentsList,
      subtitles: subtitles || [],
      blurBox: blurBox || { enabled: false, xPercent: 10, yPercent: 80, widthPercent: 80, heightPercent: 15, strength: 20 },
      subtitleStyle: subtitleStyle || { fontSize: 28, textColor: '#FFFFFF', bgColor: '#000000', bgOpacity: 0.7, bottomMarginPercent: 8, fontFamily: 'Noto Sans Myanmar' },
      outputPath,
      videoDuration: videoDuration || 10,
      onProgress: (pct) => {
        if (jobId) {
          jobProgress[jobId] = {
            percent: pct,
            status: `Rendering final video with blur box, Burmese subtitles, and narration: ${pct}%`
          };
        }
      }
    });

    if (jobId) {
      jobProgress[jobId] = { percent: 100, status: 'Rendering complete!' };
    }

    const renderedUrl = `/api/media/rendered/${outputFilename}`;
    const stats = fs.statSync(outputPath);

    return res.json({
      success: true,
      renderedUrl,
      outputFilename,
      sizeBytes: stats.size
    });
  } catch (err: any) {
    if (req.body.jobId) {
      jobProgress[req.body.jobId] = { percent: 0, status: 'Error', error: err.message };
    }
    return res.status(500).json({ error: `Final rendering failed: ${err.message}` });
  }
});

/**
 * 11. Progress polling
 */
router.get('/progress/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const prog = jobProgress[jobId] || { percent: 0, status: 'Waiting' };
  return res.json(prog);
});

/**
 * 12. Media Streaming with HTTP Range Support
 */
router.get('/media/:folder/:filename', (req: Request, res: Response) => {
  const { folder, filename } = req.params;
  let basePath = '';

  if (folder === 'videos') basePath = VIDEOS_DIR;
  else if (folder === 'audio') basePath = AUDIO_DIR;
  else if (folder === 'tts') basePath = TTS_AUDIO_DIR;
  else if (folder === 'rendered') basePath = RENDERED_DIR;
  else return res.status(400).send('Invalid folder');

  // Security: prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(basePath, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(safeFilename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.mp3') contentType = 'audio/mpeg';
  else if (ext === '.wav') contentType = 'audio/wav';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

export default router;
