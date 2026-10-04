import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  VideoMetadata,
  BlurBoxConfig,
  SubtitleStyleConfig,
  RecapSegment,
  SubtitleChunk,
  VideoTransformConfig,
  AudioSettings
} from '../../src/types/index.ts';

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
   * Generate an Advanced SubStation Alpha (.ass) subtitle file with Burmese font,
   * customizable alignment, vertical position presets, font size, safe margins, outline and shadow.
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
      const clean = (hex || '#FFFFFF').replace('#', '');
      const r = clean.substring(0, 2) || 'FF';
      const g = clean.substring(2, 4) || 'FF';
      const b = clean.substring(4, 6) || 'FF';
      const alphaVal = Math.min(255, Math.max(0, Math.round((1 - alphaPercent) * 255)));
      const alphaHex = alphaVal.toString(16).padStart(2, '0').toUpperCase();
      return `&H${alphaHex}${b}${g}${r}`;
    };

    const primaryColor = hexToAssColor(style.textColor || '#FFFFFF', 1);
    const backColor = hexToAssColor(style.bgColor || '#000000', style.bgOpacity ?? 0.75);
    const outlineColor = '&H00000000'; // black outline

    // Calculate ASS Alignment
    // Horizontal: left = 1, center = 2, right = 3
    let hOffset = 2;
    if (style.horizontalAlign === 'left') hOffset = 1;
    else if (style.horizontalAlign === 'right') hOffset = 3;

    // Vertical: bottom = 0, center = 3, top = 6
    let vOffset = 0;
    const vPos = style.verticalPosition || 'bottom';
    if (vPos === 'top' || vPos === 'upper') {
      vOffset = 6;
    } else if (vPos === 'center') {
      vOffset = 3;
    } else {
      vOffset = 0; // bottom or lower
    }

    const alignment = hOffset + vOffset;

    // Safe Area Margins
    let marginL = 20;
    let marginR = 20;
    if (style.horizontalAlign === 'left') {
      marginL = Math.max(40, Math.round(width * 0.05));
    } else if (style.horizontalAlign === 'right') {
      marginR = Math.max(40, Math.round(width * 0.05));
    }

    // Vertical Margin
    const yOffset = typeof style.yOffsetPercent === 'number'
      ? style.yOffsetPercent
      : (style.bottomMarginPercent || 8);

    let marginV = Math.round((yOffset / 100) * height);
    if (vPos === 'lower' && yOffset < 15) {
      marginV = Math.round(0.18 * height);
    } else if (vPos === 'upper' && yOffset < 15) {
      marginV = Math.round(0.18 * height);
    } else if (vPos === 'center') {
      marginV = 0;
    }

    // Keep subtitle strictly within safe area
    marginV = Math.max(15, Math.min(Math.round(height * 0.45), marginV));

    const outlineWidth = style.outline !== false ? 3 : 0;
    const shadowDepth = style.shadow !== false ? 2 : 0;
    const fontSize = Math.min(120, Math.max(12, style.fontSize || 36));

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
Style: RecapDefault,Noto Sans Myanmar SemiBold,${fontSize},${primaryColor},&H000000FF,${outlineColor},${backColor},0,0,0,0,100,100,0,0,1,${outlineWidth},${shadowDepth},${alignment},${marginL},${marginR},${marginV},1

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
   * 1. Video Transform: Crop -> Mirror
   * 2. Subtitle Blur box (boxblur)
   * 3. Audio Mixing: Original video audio (0% - 200% / mute) + Burmese narration (0% - 200%)
   * 4. Burmese Recap Subtitle burn-in (via libass)
   * 5. Encoding
   */
  static async renderFinalVideo({
    videoPath,
    audioSegments,
    subtitles,
    blurBox,
    subtitleStyle,
    videoTransform,
    audioSettings,
    outputPath,
    videoDuration,
    onProgress
  }: {
    videoPath: string;
    audioSegments: { start: number; filePath: string }[];
    subtitles: SubtitleChunk[];
    blurBox: BlurBoxConfig;
    subtitleStyle: SubtitleStyleConfig;
    videoTransform?: VideoTransformConfig;
    audioSettings?: AudioSettings;
    outputPath: string;
    videoDuration: number;
    onProgress?: (progress: number) => void;
  }): Promise<string> {
    const tempDir = path.join(path.dirname(outputPath), `render_tmp_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // 1. Get original video dimensions
      const meta = await this.getVideoMetadata(videoPath, 'video.mp4', '');
      const origW = meta.width;
      const origH = meta.height;

      // 2. Compute Crop dimensions (if enabled)
      let targetW = origW;
      let targetH = origH;
      let isCropActive = false;
      let cropFilter = '';

      if (videoTransform?.crop?.enabled) {
        const c = videoTransform.crop;
        let cW = Math.round((c.widthPercent / 100) * origW);
        let cH = Math.round((c.heightPercent / 100) * origH);
        let cX = Math.round((c.xPercent / 100) * origW);
        let cY = Math.round((c.yPercent / 100) * origH);

        // Ensure even values for H.264 YUV420p
        if (cW % 2 !== 0) cW -= 1;
        if (cH % 2 !== 0) cH -= 1;
        if (cX % 2 !== 0) cX -= 1;
        if (cY % 2 !== 0) cY -= 1;

        cW = Math.max(32, Math.min(origW - cX, cW));
        cH = Math.max(32, Math.min(origH - cY, cH));
        cX = Math.max(0, Math.min(origW - cW, cX));
        cY = Math.max(0, Math.min(origH - cH, cY));

        if (cW < origW || cH < origH || cX > 0 || cY > 0) {
          isCropActive = true;
          targetW = cW;
          targetH = cH;
          cropFilter = `crop=${cW}:${cH}:${cX}:${cY}`;
        }
      }

      // 3. Generate ASS subtitle file sized to target dimensions
      const assPath = path.join(tempDir, 'subtitles.ass');
      this.generateAssSubtitleFile(subtitles, subtitleStyle, targetW, targetH, assPath);

      // 4. Build Video Filter Graph:
      // Order: 1. Input -> 2. Crop -> 3. Mirror -> 4. Blur Box -> 5. Subtitles
      let vfNodes: string[] = [];
      let currentTag = '0:v';

      // Step A: Crop
      if (isCropActive) {
        vfNodes.push(`[${currentTag}]${cropFilter}[v_crop]`);
        currentTag = 'v_crop';
      }

      // Step B: Mirror (Horizontal Flip)
      if (videoTransform?.mirror) {
        vfNodes.push(`[${currentTag}]hflip[v_mirror]`);
        currentTag = 'v_mirror';
      }

      // Step C: Subtitle Blur Box (applied to the current cropped/mirrored video coordinates)
      if (blurBox.enabled && blurBox.strength > 0) {
        let bW = Math.round((blurBox.widthPercent / 100) * targetW);
        let bH = Math.round((blurBox.heightPercent / 100) * targetH);
        let bX = Math.round((blurBox.xPercent / 100) * targetW);
        let bY = Math.round((blurBox.yPercent / 100) * targetH);

        if (bW % 2 !== 0) bW -= 1;
        if (bH % 2 !== 0) bH -= 1;
        if (bX % 2 !== 0) bX -= 1;
        if (bY % 2 !== 0) bY -= 1;

        bW = Math.max(16, Math.min(targetW - bX, bW));
        bH = Math.max(16, Math.min(targetH - bY, bH));
        bX = Math.max(0, Math.min(targetW - bW, bX));
        bY = Math.max(0, Math.min(targetH - bH, bY));

        const lumaRadius = Math.min(50, Math.max(4, Math.round(blurBox.strength / 2)));
        vfNodes.push(
          `[${currentTag}]split[v_base][v_box];` +
          `[v_box]crop=${bW}:${bH}:${bX}:${bY},boxblur=luma_radius=${lumaRadius}:luma_power=2[v_blurred];` +
          `[v_base][v_blurred]overlay=${bX}:${bY}[v_masked]`
        );
        currentTag = 'v_masked';
      }

      // Step D: Burn-in Burmese Subtitles
      vfNodes.push(`[${currentTag}]ass='${assPath.replace(/'/g, "\\'")}'[vout]`);

      // 5. Build Audio Filter Graph (Sections 1, 2, 3: Original Audio Volume + Burmese Voice Volume + Muting)
      const origVol = audioSettings?.originalMuted ? 0 : (audioSettings?.originalVolume ?? 1.0);
      const voiceVol = audioSettings?.voiceVolume ?? 1.0;

      const ffmpegArgs: string[] = ['-y', '-i', videoPath];
      const validSegments = audioSegments.filter((s) => fs.existsSync(s.filePath));

      for (const seg of validSegments) {
        ffmpegArgs.push('-i', seg.filePath);
      }

      let afNodes: string[] = [];

      if (validSegments.length > 0) {
        let delayedAudioTags: string[] = [];

        validSegments.forEach((seg, idx) => {
          const inputIdx = idx + 1;
          const delayMs = Math.max(0, Math.round(seg.start * 1000));
          const tag = `a_seg_${idx}`;
          afNodes.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs}[${tag}]`);
          delayedAudioTags.push(`[${tag}]`);
        });

        // Combine all narration segments into one narration audio track
        if (delayedAudioTags.length > 1) {
          afNodes.push(
            `${delayedAudioTags.join('')}amix=inputs=${delayedAudioTags.length}:dropout_transition=0:normalize=0[narration_mix]`
          );
        } else {
          afNodes.push(
            `${delayedAudioTags[0]}aformat=sample_rates=44100:channel_layouts=stereo[narration_mix]`
          );
        }

        // Apply voice volume
        afNodes.push(`[narration_mix]volume=${voiceVol.toFixed(2)}[narration_vol]`);

        // Mix with Original Movie Audio (using origVol)
        if (meta.hasAudio && origVol > 0) {
          afNodes.push(`[0:a]volume=${origVol.toFixed(2)}[bg_audio]`);
          afNodes.push(
            `[bg_audio][narration_vol]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`
          );
        } else {
          // Original is muted or 0% volume: only narration
          afNodes.push(`[narration_vol]aformat=sample_rates=44100:channel_layouts=stereo[aout]`);
        }
      } else {
        // No narration segments
        if (meta.hasAudio && origVol > 0) {
          afNodes.push(`[0:a]volume=${origVol.toFixed(2)}[aout]`);
        } else {
          // Muted or no audio
          afNodes.push(`anullsrc=r=44100:cl=stereo,atrim=duration=${videoDuration || 10}[aout]`);
        }
      }

      // Combine video and audio filters
      const fullFilterComplex = vfNodes.join(';') + ';' + afNodes.join(';');

      ffmpegArgs.push('-filter_complex', fullFilterComplex);
      ffmpegArgs.push('-map', '[vout]');
      ffmpegArgs.push('-map', '[aout]');
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');

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

