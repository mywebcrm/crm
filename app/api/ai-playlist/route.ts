import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_COUNT = 20;
const MAX_COUNT = 50;
const MIN_COUNT = 5;
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

interface GeneratedTrack {
  title: string;
  artist: string;
  reason?: string;
}

interface OpenAIChatCompletion {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not set. Define it in your environment to enable AI playlist generation.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { seedTracks, description, count } = body as {
      seedTracks?: unknown;
      description?: unknown;
      count?: unknown;
    };

    const normalizedSeeds = normalizeSeedTracks(seedTracks);
    if (!normalizedSeeds.length) {
      return NextResponse.json(
        { error: 'Укажите хотя бы один трек - по одному на строку или в виде массива.' },
        { status: 400 }
      );
    }

    const playlistContext = typeof description === 'string' ? description.trim() : '';
    const targetCount = clampCount(count);

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'You are a seasoned music director for an electronic music venue. Recommend tracks that fit together sonically, balancing familiarity with fresh discoveries. Always respond with strict JSON.'
          },
          {
            role: 'user',
            content: buildUserPrompt(normalizedSeeds, playlistContext, targetCount)
          }
        ]
      })
    });

    if (!completion.ok) {
      const errorPayload = await safeParseJson(await completion.text());
      const message =
        (errorPayload && (errorPayload.error?.message || errorPayload.message)) ||
        'Не удалось получить ответ от модели.';
      return NextResponse.json({ error: message }, { status: completion.status });
    }

    const data: OpenAIChatCompletion = await completion.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: 'Модель не вернула содержимое. Попробуйте ещё раз.' },
        { status: 502 }
      );
    }

    const parsedTracks = parseTracksFromContent(rawContent);

    if (!parsedTracks.length) {
      return NextResponse.json(
        { error: 'Не удалось разобрать ответ модели. Уточните запрос и повторите попытку.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ tracks: parsedTracks });
  } catch (error) {
    console.error('AI playlist generation failed:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при генерации плейлиста. Повторите попытку позже.' },
      { status: 500 }
    );
  }
}

function normalizeSeedTracks(input: unknown): string[] {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    const normalized = input
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (item && typeof item === 'object') {
          const { title, name, artist } = item as Record<string, string | undefined>;
          const pieces = [artist, title ?? name].filter(Boolean);
          return pieces.join(' - ').trim();
        }
        return '';
      })
      .filter(Boolean);

    return Array.from(new Set(normalized));
  }

  if (typeof input === 'string') {
    const lines = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return Array.from(new Set(lines));
  }

  return [];
}

function clampCount(input: unknown): number {
  const numeric = typeof input === 'number' ? input : Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_COUNT;
  }

  return Math.min(Math.max(Math.round(numeric), MIN_COUNT), MAX_COUNT);
}

function buildUserPrompt(seeds: string[], context: string, count: number): string {
  const formattedSeeds = seeds.map((track, index) => `${index + 1}. ${track}`).join('\n');
  const lines = [
    `Вот плейлист, на основе которого нужно составить свежий топ из ${count} треков:`,
    formattedSeeds,
    context ? `Дополнительный контекст плейлиста: ${context}` : '',
    '',
    'Требования к ответу:',
    '- Верни JSON объект формата {"tracks": Array<Track>}.',
    '- Track = {"title": string, "artist": string, "reason": string}.',
    '- reason - короткая фраза на русском о том, почему трек подходит.',
    '- Не повторяй исходные треки. Подбирай релевантные и интересные альтернативы.',
    '- Держи баланс хитов и свежих находок, думая о драматургии сета.',
    '- Верни только JSON без пояснений и Markdown.'
  ];

  return lines.filter(Boolean).join('\n');
}

function parseTracksFromContent(content: string): GeneratedTrack[] {
  try {
    const jsonText = extractJson(content);
    if (!jsonText) {
      return [];
    }

    const parsed = JSON.parse(jsonText) as { tracks?: GeneratedTrack[] };
    if (!Array.isArray(parsed.tracks)) {
      return [];
    }

    return parsed.tracks
      .map((track) => ({
        title: track.title?.trim(),
        artist: track.artist?.trim(),
        reason: track.reason?.trim()
      }))
      .filter((track) => track.title && track.artist) as GeneratedTrack[];
  } catch (error) {
    console.warn('Failed to parse model JSON:', error);
    return [];
  }
}

function extractJson(text: string): string | null {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return text.slice(firstBrace, lastBrace + 1);
}

function safeParseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}
