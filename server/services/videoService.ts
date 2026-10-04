import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { VideoMetadata, BlurBoxConfig, SubtitleStyleConfig, RecapSegment, SubtitleChunk } from '../../src/types/index.ts';

export class VideoService {
  /**
   * Run ffprobe to get media metadata
   */
  static async getVideoMetadata(filePath: string, originalName: string, videoUrl: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const probe = spawn('ffprobe', args);
      let stdout = '';
      let stderr = '';

      probe.stdout.on('data', (d) => { stdout += d.toString(); });
      probe.stderr.on('data', (d) => { stderr += d.toString(); });

      probe.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`ffprobe failed: ${stderr || 'Unknown error'}`));
        }

        try {
          const info = JSON.parse(stdout);
          const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
          const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');
          const subtitleStreams = info.streams?.filter((s: any) => s.codec_type === 'subtitle') || [];

          let duration = parseFloat(info.format?.duration || videoStream?.duration || '0');
          if (isNaN(duration) || duration <= 0) {
            duration = 10; // fallback
          }

          let fps = 24;
          if (videoStream?.r_frame_rate) {
            const parts = videoStream.r_frame_rate.split('/');
            if (parts.length === 2 && parseFloat(parts[1]) > 0) {
              fps = Math.round((parseFloat(parts[0]) / parseFloat(parts[1])) * 100) / 100;
            }
          }

          const stats = fs.statSync(filePath);

          const metadata: VideoMetadata = {
            filename: path.basename(filePath),
            originalName: originalName || path.basename(filePath),
            sizeBytes: stats.size,
            durationSeconds: Math.round(duration * 100) / 100,
            width: videoStream?.width || 1280,
            height: videoStream?.height || 720,
            fps: fps || 24,
            format: info.format?.format_name || 'mp4',
            hasAudio: !!audioStream,
            audioCodec: audioStream?.codec_name,
            hasSubtitles: subtitleStreams.length > 0,
            subtitleTracks: subtitleStreams.map((s: any, idx: number) => ({
              index: s.index || idx,
              language: s.tags?.language || 'und',
              title: s.tags?.title || `Track ${idx + 1}`,
              codec: s.codec_name
            })),
            videoUrl
          };

          resolve(metadata);
        } catch (err: any) {
          reject(new Error(`Failed to parse media metadata: ${err.message}`));
        }
      });
    });
  }

  /**
   * Extract audio track from video using ffmpeg
   */
  static async extractAudio(
    videoPath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // Extract to 44.1kHz stereo MP3, 128k bitrate (high quality, fast for Gemini transcription)
      const args = [
        '-y',
        '-i', videoPath,
        '-vn', // no video
        '-acodec', 'libmp3lame',
        '-ar', '44100',
        '-ac', '2',
        '-b:a', '128k',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (d) => {
        stderr += d.toString();
        // Simple progress parsing if duration is present
        if (onProgress && stderr.includes('time=')) {
          onProgress(50);
        }
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`FFmpeg audio extraction failed: ${stderr.slice(-300)}`));
        }
        if (onProgress) onProgress(100);
        resolve(outputPath);
      });
    });
  }

  /**
   * Generates a sample movie scene video for instant testing
   */
  static async createSampleDemoVideo(outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // Generate a 12-second dramatic demo video clip with colored visual scenes and spoken dialogue tone
      const filter = `
        testsrc=duration=12:size=1280x720:rate=24 [bg];
        drawbox=y=600:w=1280:h=90:color=black@0.7:t=fill [box];
        drawtext=text='Original Subtitle\\: John enters the room and investigates':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=630 [sub];
        [bg][box] overlay [b1];
        [b1][sub] overlay [v]
      `.replace(/\s+/g, ' ').trim();

      const args = [
        '-y',
        '-f', 'lavfi', '-i', 'testsrc=duration=12:size=1280x720:rate=24',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=12',
        '-vf', "drawbox=y=580:w=1280:h=100:color=black@0.6:t=fill,drawtext=text='[ENGLISH SUBTITLE: John enters the room and looks around]':fontcolor=yellow:fontsize=30:x=(w-text_w)/2:y=615",
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';
      ffmpeg.stderr.on('data', (d) => { stderr += d.toString(); });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Demo video generation failed: ${stderr.slice(-300)}`));
        }
        resolve(outputPath);
      });
    });
  }

  /**
   * Helper to format seconds to ASS timestamp (H:MM:SS.cs)
   */
  static formatAssTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centis = Math.floor((seconds % 1) * 100);
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(centis)}`;
  }

  /**
   * Generate an Advanced SubStation Alpha (.ass) subtitle file with Burmese font
   */
  static generateAssSubtitleFile(
    subtitles: SubtitleChunk[],
    style: SubtitleStyleConfig,
    width: number,
    height: number,
    outputPath: string
  ): void {
    // Convert hex color #RRGGBB to ASS &H00BBGGRR
    const hexToAssColor = (hex: string, alphaPercent: number = 0): string => {
      const clean = hex.replace('#', '');
      const r = clean.substring(0, 2);
      const g = clean.substring(2, 4);
      const b = clean.substring(4, 6);
      const alphaVal = Math.min(255, Math.max(0, Math.round((1 - alphaPercent) * 255)));
      const alphaHex = alphaVal.toString(16).padStart(2, '0').toUpperCase();
      return `&H${alphaHex}${b}${g}${r}`;
    };

    const primaryColor = hexToAssColor(style.textColor, 1); // 100% visible
    const backColor = hexToAssColor(style.bgColor, style.bgOpacity);
    const outlineColor = '&H00000000'; // black outline

    const marginV = Math.round((style.bottomMarginPercent / 100) * height) || 40;

    let assContent = `[Script Info]
Title: Thunder Studio Burmese Recap
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: ${width}
PlayResY: ${height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: RecapDefault,Noto Sans Myanmar,${style.fontSize},${primaryColor},&H000000FF,${outlineColor},${backColor},-1,0,0,0,100,100,0,0,1,2,1,2,20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Sort chronologically
    const sorted = [...subtitles].sort((a, b) => a.start - b.start);

    for (const sub of sorted) {
      if (!sub.text || sub.text.trim() === '') continue;
      const startAss = this.formatAssTime(sub.start);
      const endAss = this.formatAssTime(sub.end);
      const cleanText = sub.text.replace(/\r?\n/g, '\\N');
      assContent += `Dialogue: 0,${startAss},${endAss},RecapDefault,,0,0,0,,${cleanText}\n`;
    }

    fs.writeFileSync(outputPath, assContent, 'utf8');
  }

  /**
   * Render final video with:
   * 1. Subtitle Blur box (boxblur)
   * 2. Burmese Recap Subtitle burn-in (via libass)
   * 3. Audio mix: Original audio ducked + Burmese narration audio segments at respective timestamps
   */
  static async renderFinalVideo({
    videoPath,
    audioSegments,
    subtitles,
    blurBox,
    subtitleStyle,
    outputPath,
    videoDuration,
    onProgress
  }: {
    videoPath: string;
    audioSegments: { start: number; filePath: string }[];
    subtitles: SubtitleChunk[];
    blurBox: BlurBoxConfig;
    subtitleStyle: SubtitleStyleConfig;
    outputPath: string;
    videoDuration: number;
    onProgress?: (progress: number) => void;
  }): Promise<string> {
    const tempDir = path.join(path.dirname(outputPath), `render_tmp_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // 1. Get video dimensions
      const meta = await this.getVideoMetadata(videoPath, 'video.mp4', '');
      const width = meta.width;
      const height = meta.height;

      // 2. Generate ASS subtitle file
      const assPath = path.join(tempDir, 'subtitles.ass');
      this.generateAssSubtitleFile(subtitles, subtitleStyle, width, height, assPath);

      // 3. Build video filter chain:
      // If blur enabled, calculate pixel coordinates
      let vfParts: string[] = [];
      let inputVTag = '0:v';

      if (blurBox.enabled && blurBox.strength > 0) {
        let cropW = Math.round((blurBox.widthPercent / 100) * width);
        let cropH = Math.round((blurBox.heightPercent / 100) * height);
        let cropX = Math.round((blurBox.xPercent / 100) * width);
        let cropY = Math.round((blurBox.yPercent / 100) * height);

        // Ensure even dimensions for YUV420p
        if (cropW % 2 !== 0) cropW -= 1;
        if (cropH % 2 !== 0) cropH -= 1;
        if (cropX % 2 !== 0) cropX -= 1;
        if (cropY % 2 !== 0) cropY -= 1;

        cropW = Math.max(16, Math.min(width - cropX, cropW));
        cropH = Math.max(16, Math.min(height - cropY, cropH));
        cropX = Math.max(0, Math.min(width - cropW, cropX));
        cropY = Math.max(0, Math.min(height - cropH, cropY));

        const lumaRadius = Math.min(50, Math.max(4, Math.round(blurBox.strength / 2)));
        // split -> crop -> boxblur -> overlay
        vfParts.push(
          `[0:v]split[vbase][vcrop];` +
          `[vcrop]crop=${cropW}:${cropH}:${cropX}:${cropY},boxblur=luma_radius=${lumaRadius}:luma_power=2[vblur];` +
          `[vbase][vblur]overlay=${cropX}:${cropY}[vblended];` +
          `[vblended]ass='${assPath.replace(/'/g, "\\'")}'[vout]`
        );
      } else {
        vfParts.push(`[0:v]ass='${assPath.replace(/'/g, "\\'")}'[vout]`);
      }

      // 4. Build audio filter graph
      // Input 0 is original video.
      // Next inputs are audio segments: [1], [2], [3], etc.
      const ffmpegArgs: string[] = ['-y', '-i', videoPath];

      const validSegments = audioSegments.filter(s => fs.existsSync(s.filePath));

      for (const seg of validSegments) {
        ffmpegArgs.push('-i', seg.filePath);
      }

      let filterComplex = '';

      if (validSegments.length > 0) {
        let delayedAudioTags: string[] = [];

        // For each narration segment, delay by start time in milliseconds
        validSegments.forEach((seg, idx) => {
          const inputIdx = idx + 1;
          const delayMs = Math.max(0, Math.round(seg.start * 1000));
          const tag = `a_seg_${idx}`;
          filterComplex += `[${inputIdx}:a]adelay=${delayMs}|${delayMs}[${tag}];`;
          delayedAudioTags.push(`[${tag}]`);
        });

        // Combine all narration segments into one narration audio track
        if (delayedAudioTags.length > 1) {
          filterComplex += `${delayedAudioTags.join('')}amix=inputs=${delayedAudioTags.length}:dropout_transition=0:normalize=0[narration_all];`;
        } else {
          filterComplex += `${delayedAudioTags[0]}aformat=sample_rates=44100:channel_layouts=stereo[narration_all];`;
        }

        // Mix ducked original audio (15%) + narration (100%)
        if (meta.hasAudio) {
          filterComplex += `[0:a]volume=0.15[bg_audio];[bg_audio][narration_all]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`;
        } else {
          filterComplex += `[narration_all]volume=1.0[aout]`;
        }
      } else {
        // No narration audio segments, keep original audio
        if (meta.hasAudio) {
          filterComplex += `[0:a]volume=1.0[aout]`;
        }
      }

      // Combine video filter and audio filter
      const fullFilterComplex = vfParts.join(';') + (filterComplex ? ';' + filterComplex : '');

      ffmpegArgs.push('-filter_complex', fullFilterComplex);
      ffmpegArgs.push('-map', '[vout]');

      if (validSegments.length > 0 || meta.hasAudio) {
        ffmpegArgs.push('-map', '[aout]');
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
      }

      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        outputPath
      );

      return new Promise((resolve, reject) => {
        const renderProc = spawn('ffmpeg', ffmpegArgs);
        let stderr = '';

        renderProc.stderr.on('data', (data) => {
          const str = data.toString();
          stderr += str;

          // Parse progress from time=HH:MM:SS.xx
          const timeMatch = str.match(/time=(\d+):(\d+):(\d+\.\d+)/);
          if (timeMatch && onProgress && videoDuration > 0) {
            const currentSeconds =
              parseInt(timeMatch[1], 10) * 3600 +
              parseInt(timeMatch[2], 10) * 60 +
              parseFloat(timeMatch[3]);
            const pct = Math.min(99, Math.round((currentSeconds / videoDuration) * 100));
            onProgress(pct);
          }
        });

        renderProc.on('close', (code) => {
          // Clean up temp dir
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (_) {}

          if (code !== 0) {
            return reject(new Error(`Rendering failed: ${stderr.slice(-500)}`));
          }

          if (onProgress) onProgress(100);
          resolve(outputPath);
        });
      });
    } catch (err) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {}
      throw err;
    }
  }
}
