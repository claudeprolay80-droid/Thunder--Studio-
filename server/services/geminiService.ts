import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { TranscriptSegment, RecapSegment, SubtitleChunk } from '../../src/types/index.ts';

export class GeminiService {
  private static getClient(apiKey?: string): GoogleGenAI {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key || key.trim() === '') {
      throw new Error('Gemini API Key is missing. Please provide a valid Gemini API key in Settings.');
    }

    return new GoogleGenAI({
      apiKey: key.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  /**
   * Test if provided API key is valid
   */
  static async testApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const ai = this.getClient(apiKey);
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Hello, respond with {"status": "ok"}',
        config: {
          responseMimeType: 'application/json'
        }
      });
      if (res && res.text) {
        return { success: true, message: 'Gemini API key is valid and connected successfully!' };
      }
      return { success: false, message: 'No response received from Gemini API.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid Gemini API Key.' };
    }
  }

  /**
   * Generates chronological transcript with timestamps from extracted audio file
   */
  static async generateTranscript(
    audioFilePath: string,
    apiKey?: string,
    videoDuration?: number
  ): Promise<TranscriptSegment[]> {
    const ai = this.getClient(apiKey);

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const audioBytes = fs.readFileSync(audioFilePath);
    const base64Audio = audioBytes.toString('base64');

    const prompt = `You are an expert audio transcriber and video editor.
Transcribe this audio file into chronological timestamped segments.
Return strict JSON matching this schema:
{
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "text": "Dialogue or sound description"
    }
  ]
}

STRICT RULES:
1. Valid JSON only. Do not wrap in markdown or backticks.
2. Chronological order.
3. Every segment MUST have numeric 'start' and 'end' in seconds.
4. 'start' must be strictly less than 'end' (start < end).
5. Segments must NEVER overlap (each start >= previous end).
6. Transcribe actual spoken words, dialogue, and important narration.
7. If there are silent gaps or background sounds, transcribe meaningful moments.
${videoDuration ? `The total media duration is ${videoDuration} seconds.` : ''}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: 'audio/mp3',
              data: base64Audio
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const rawText = response.text?.trim() || '{}';
      const cleanJson = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      const rawSegments = parsed.segments || (Array.isArray(parsed) ? parsed : []);
      const validated = this.validateAndSortTranscript(rawSegments, videoDuration || 60);

      if (validated.length === 0) {
        // Fallback if audio was mostly silent or music
        return [
          {
            id: 'seg_0',
            start: 0,
            end: Math.min(videoDuration || 10, 5),
            text: '[Scene opening / ambient sound]'
          }
        ];
      }

      return validated;
    } catch (err: any) {
      throw new Error(`Gemini Transcript Generation failed: ${err.message}`);
    }
  }

  /**
   * Generates time-aligned movie recap with Burmese narration & English pronunciation conversion
   */
  static async generateRecap(
    transcriptSegments: TranscriptSegment[],
    apiKey?: string,
    videoDuration?: number
  ): Promise<RecapSegment[]> {
    const ai = this.getClient(apiKey);

    const prompt = `You are a professional Burmese (Myanmar) Movie Recap Narrator and Screenwriter.
Given the following chronological transcript segments from a movie:
${JSON.stringify(transcriptSegments, null, 2)}

Your task:
1. Generate a chronological movie recap script following the actual sequence of events.
2. Do NOT create a generic summary or disconnected paragraphs. The recap must preserve the timeline of the scenes and maintain story continuity.
3. Remove redundant filler, and summarize key actions and dialogue into concise narration sentences.
4. Each segment MUST have realistic time boundaries (start and end in seconds) aligned with the scene.
5. Translate into natural, engaging spoken Burmese movie recap narration style (like professional Burmese movie recap YouTube channels: "အဲဒီအချိန်မှာ...", "သူမက...", "ဒီလိုနဲ့...").
6. CRITICAL RULE FOR ENGLISH TERMS & PROPER NAMES:
   Convert all English character names, technical terms, locations, brands, and organizations into natural Myanmar-readable pronunciation phonetics so Edge TTS can pronounce them authentically in Burmese:
   Examples:
   - John -> ဂျွန်
   - Michael -> မိုက်ကယ်
   - Doctor -> ဒေါက်တာ
   - Computer -> ကွန်ပျူတာ
   - Police -> ပိုလစ်
   - Los Angeles -> လော့စ်အိန်ဂျလိစ်
   - Sarah -> ဆာရာ
   - Detective -> စုံထောက် (or ဒီတက်တစ်)
   - Gun / Pistol -> သေနတ်
   - Car / Vehicle -> ကား
   Do NOT leave English words in Latin alphabet. Convert English words into Myanmar phonetic script!

Return strict JSON schema:
{
  "segments": [
    {
      "start": 0.0,
      "end": 4.5,
      "english_recap": "A young detective arrives at the crime scene in the rain.",
      "burmese_recap": "မိုးသည်းထန်စွာ ရွာသွန်းနေတဲ့အချိန်မှာ ဂျွန် ဆိုတဲ့ စုံထောက်တစ်ယောက် အခင်းဖြစ်ပွားရာ နေရာကို ရောက်ရှိလာပါတယ်။"
    }
  ]
}

STRICT CONSTRAINTS:
- Valid JSON only, no markdown.
- Chronological ordering strictly enforced.
- Start < End, and segments must NOT overlap.
- Natural spoken Burmese grammar.
${videoDuration ? `Total video duration is ${videoDuration} seconds.` : ''}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const rawText = response.text?.trim() || '{}';
      const cleanJson = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      const segmentsRaw = parsed.segments || (Array.isArray(parsed) ? parsed : []);
      const validated = this.validateAndSortRecap(segmentsRaw, videoDuration || 60);

      if (validated.length === 0) {
        throw new Error('No valid recap segments were returned by Gemini.');
      }

      return validated;
    } catch (err: any) {
      throw new Error(`Gemini Recap Script Generation failed: ${err.message}`);
    }
  }

  /**
   * Chunks Burmese narration sentences into short, readable subtitle phrases (2-6 words each)
   * with synchronized timestamps
   */
  static chunkSubtitlesForRecap(recapSegments: RecapSegment[]): SubtitleChunk[] {
    const chunks: SubtitleChunk[] = [];
    let chunkIdCounter = 0;

    for (const seg of recapSegments) {
      const text = seg.burmese_recap.trim();
      if (!text) continue;

      // Split by common Burmese clause particles, punctuation, or spaces
      // Burmese punctuation: ၊ (comma) and ။ (period/full-stop)
      // Burmese clause markers: ပြီး၊ လို့၊ က၊ ကို၊ မှာ၊ တဲ့၊ တယ်၊ ပါတယ်
      const rawPhrases = text
        .split(/(?<=[၊။])\s*|\s+(?=[က-အ])/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // Group phrases into 2-6 words or 8-25 characters
      const grouped: string[] = [];
      let currentGroup = '';

      for (const phrase of rawPhrases) {
        if (!currentGroup) {
          currentGroup = phrase;
        } else if ((currentGroup + ' ' + phrase).length <= 25) {
          currentGroup += ' ' + phrase;
        } else {
          grouped.push(currentGroup);
          currentGroup = phrase;
        }
      }
      if (currentGroup) {
        grouped.push(currentGroup);
      }

      const finalPhrases = grouped.length > 0 ? grouped : [text];
      const segDuration = Math.max(0.8, seg.end - seg.start);
      const stepDuration = segDuration / finalPhrases.length;

      finalPhrases.forEach((phrase, idx) => {
        const start = Math.round((seg.start + idx * stepDuration) * 100) / 100;
        const end = Math.round((seg.start + (idx + 1) * stepDuration) * 100) / 100;

        chunks.push({
          id: `chunk_${chunkIdCounter++}`,
          segmentId: seg.id,
          start,
          end,
          text: phrase
        });
      });
    }

    return chunks;
  }

  /**
   * Helper to validate and sort transcript segments
   */
  private static validateAndSortTranscript(raw: any[], maxDuration: number): TranscriptSegment[] {
    const list: TranscriptSegment[] = [];

    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      let start = parseFloat(item.start);
      let end = parseFloat(item.end);
      const text = String(item.text || '').trim();

      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end <= start) end = start + 3.0;
      if (end > maxDuration + 5) end = maxDuration;
      if (!text) continue;

      list.push({
        id: `trans_${i}`,
        start: Math.round(start * 100) / 100,
        end: Math.round(end * 100) / 100,
        text
      });
    }

    // Sort chronologically
    list.sort((a, b) => a.start - b.start);

    // Ensure non-overlapping
    for (let i = 1; i < list.length; i++) {
      if (list[i].start < list[i - 1].end) {
        list[i].start = list[i - 1].end;
        if (list[i].end <= list[i].start) {
          list[i].end = list[i].start + 1.5;
        }
      }
    }

    return list;
  }

  /**
   * Helper to validate and sort recap segments
   */
  private static validateAndSortRecap(raw: any[], maxDuration: number): RecapSegment[] {
    const list: RecapSegment[] = [];

    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      let start = parseFloat(item.start);
      let end = parseFloat(item.end);
      const english_recap = String(item.english_recap || '').trim();
      const burmese_recap = String(item.burmese_recap || '').trim();

      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end <= start) end = start + 4.0;
      if (end > maxDuration + 5) end = maxDuration;
      if (!burmese_recap && !english_recap) continue;

      list.push({
        id: `recap_${i}`,
        start: Math.round(start * 100) / 100,
        end: Math.round(end * 100) / 100,
        english_recap: english_recap || burmese_recap,
        burmese_recap: burmese_recap || english_recap
      });
    }

    // Sort chronologically
    list.sort((a, b) => a.start - b.start);

    // Prevent overlapping
    for (let i = 1; i < list.length; i++) {
      if (list[i].start < list[i - 1].end) {
        list[i].start = list[i - 1].end;
        if (list[i].end <= list[i].start) {
          list[i].end = list[i].start + 2.0;
        }
      }
    }

    return list;
  }
}
