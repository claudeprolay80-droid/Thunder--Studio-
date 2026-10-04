import fs from 'fs';
import path from 'path';
// @ts-ignore
import { EdgeTTS } from '@andresaya/edge-tts';
import { VoiceSettingsConfig } from '../../src/types/index.ts';

export class TTSService {
  /**
   * Synthesize Burmese text using Microsoft Edge TTS
   */
  static async synthesizeBurmese({
    text,
    voice = 'my-MM-NilarNeural',
    speed = 1.0,
    volume = 100,
    pitch = 0
  }: {
    text: string;
    voice?: 'my-MM-NilarNeural' | 'my-MM-ThihaNeural';
    speed?: number;
    volume?: number;
    pitch?: number;
  }): Promise<{ audioBuffer: Buffer; duration: number }> {
    if (!text || text.trim() === '') {
      throw new Error('Text to synthesize cannot be empty');
    }

    // Convert speed (0.8 - 2.0) to Edge TTS rate format "+0%", "+20%", "-20%"
    let rateStr = '+0%';
    const rateDiff = Math.round((speed - 1.0) * 100);
    if (rateDiff >= 0) {
      rateStr = `+${rateDiff}%`;
    } else {
      rateStr = `${rateDiff}%`;
    }

    // Volume (0 - 100) -> Edge TTS volume format
    let volStr = '+0%';
    const volDiff = Math.round(volume - 100);
    if (volDiff >= 0) {
      volStr = `+${volDiff}%`;
    } else {
      volStr = `${volDiff}%`;
    }

    // Pitch
    let pitchStr = '+0Hz';
    if (pitch >= 0) {
      pitchStr = `+${pitch}Hz`;
    } else {
      pitchStr = `${pitch}Hz`;
    }

    const tts = new EdgeTTS();
    await tts.synthesize(text, voice, {
      rate: rateStr,
      pitch: pitchStr,
      volume: volStr
    });

    const audioBuffer = await tts.toBuffer();
    let duration = 0;
    try {
      duration = await tts.getDuration();
    } catch (_) {
      // Estimate ~3.5 syllables per second for Burmese if getDuration is unavailable
      duration = Math.max(1, text.length * 0.15);
    }

    return {
      audioBuffer,
      duration: Math.round(duration * 100) / 100
    };
  }

  /**
   * Synthesize audio for a recap segment and save to audio directory
   */
  static async generateSegmentAudio({
    segmentId,
    burmeseText,
    start,
    end,
    voiceSettings,
    outputDir
  }: {
    segmentId: string;
    burmeseText: string;
    start: number;
    end: number;
    voiceSettings: VoiceSettingsConfig;
    outputDir: string;
  }): Promise<{ filename: string; filePath: string; duration: number; speedApplied: number }> {
    fs.mkdirSync(outputDir, { recursive: true });

    const availableTime = Math.max(1.0, end - start);
    let desiredSpeed = voiceSettings.speed || 1.0;

    // First attempt at specified speed
    let result = await this.synthesizeBurmese({
      text: burmeseText,
      voice: voiceSettings.voice,
      speed: desiredSpeed,
      volume: voiceSettings.volume,
      pitch: voiceSettings.pitch
    });

    // Check if voice duration fits available video event time window
    // If voice is noticeably longer than available time (> 10%), adjust speed up to 1.4x
    let speedApplied = desiredSpeed;
    if (result.duration > availableTime * 1.15 && desiredSpeed < 1.4) {
      const requiredSpeed = Math.min(1.4, Math.max(desiredSpeed, result.duration / availableTime));
      try {
        const adjusted = await this.synthesizeBurmese({
          text: burmeseText,
          voice: voiceSettings.voice,
          speed: requiredSpeed,
          volume: voiceSettings.volume,
          pitch: voiceSettings.pitch
        });
        result = adjusted;
        speedApplied = Math.round(requiredSpeed * 100) / 100;
      } catch (_) {
        // Keep initial result if retry fails
      }
    }

    const filename = `voice_${segmentId}_${Date.now()}.mp3`;
    const filePath = path.join(outputDir, filename);

    fs.writeFileSync(filePath, result.audioBuffer);

    return {
      filename,
      filePath,
      duration: result.duration,
      speedApplied
    };
  }
}
