import OpenAI from 'openai';

export type SeedTrack = {
  title: string;
  artist: string;
};

export type GeneratedTrack = {
  title: string;
  artist: string;
  reason: string;
};

export type PlaylistSuggestion = {
  summary: string;
  tracks: GeneratedTrack[];
};

type GenerateOptions = {
  seedTracks: SeedTrack[];
  playlistContext?: string;
  topCount?: number;
};

const DEFAULT_TOP_COUNT = 20;

let cachedClient: OpenAI | null = null;

function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

function buildJsonSchema(topCount: number) {
  return {
    name: 'playlist_generation_v1',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['tracks', 'summary'],
      properties: {
        summary: {
          type: 'string',
          description: 'Short overview that describes the mood and cohesion of the generated playlist'
        },
        tracks: {
          type: 'array',
          description: 'Ordered list of recommended tracks tailored to the provided context',
          minItems: topCount,
          maxItems: topCount,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'artist', 'reason'],
            properties: {
              title: {
                type: 'string',
                minLength: 1,
                description: 'Track title'
              },
              artist: {
                type: 'string',
                minLength: 1,
                description: 'Track artist or performer'
              },
              reason: {
                type: 'string',
                minLength: 1,
                description: 'One sentence explanation why the track fits the requested vibe'
              }
            }
          }
        }
      }
    },
    strict: true
  } as const;
}

function buildPrompt({ seedTracks, playlistContext, topCount }: Required<GenerateOptions>) {
  const playlistLabel = playlistContext?.trim() ? playlistContext.trim() : 'Без описания — придумай цель и настроение плейлиста на основе треков';

  const formattedSeeds = seedTracks
    .map((track, index) => `${index + 1}. ${track.title} — ${track.artist}`)
    .join('\n');

  return `Ты — музыкальный редактор стримингового сервиса. Тебе дан список исходных треков и краткий контекст плейлиста.
Твоя задача — подготовить обновлённый топ-${topCount} треков, которые логично развивают настроение и эстетику этой подборки.

Правила:
- Используй только реальные релизы (не выдумывай исполнителей).
- Можешь сохранять часть исходных треков, но обязательно предложи свежие идеи рядом с ними.
- Следи за динамикой: впиши треки в логичную последовательность.
- Для каждого трека дай короткое объяснение (1 предложение) почему он подходит.
- Ответ верни строго в JSON по заданной схеме без комментариев и форматирования вне JSON.

Контекст плейлиста: ${playlistLabel}

Исходные треки:
${formattedSeeds}`;
}

function normalizeTrack(raw: unknown): GeneratedTrack {
  const source = (raw ?? {}) as Record<string, unknown>;
  const title = String(source.title ?? '').trim();
  const artist = String(source.artist ?? '').trim();
  const reason = String(source.reason ?? '').trim();

  if (!title || !artist || !reason) {
    throw new Error('Invalid track payload from model');
  }

  return { title, artist, reason };
}

export async function generatePlaylist(options: GenerateOptions): Promise<PlaylistSuggestion> {
  const client = getClient();
  const topCount = Number.isFinite(options.topCount) && options.topCount ? Math.min(Math.max(Number(options.topCount), 1), 50) : DEFAULT_TOP_COUNT;

  if (!options.seedTracks.length) {
    throw new Error('Необходимо указать хотя бы один трек');
  }

  const schema = buildJsonSchema(topCount);
  const prompt = buildPrompt({
    seedTracks: options.seedTracks,
    playlistContext: options.playlistContext ?? '',
    topCount
  });

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    temperature: 0.6,
    max_output_tokens: 2000,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: 'Ты — экспертный куратор плейлистов, специализирующийся на анализе музыкальных трендов и подборе треков под заданный вайб. Отвечай по-русски.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: schema
    }
  });

  const textPayload = response.output_text;

  if (!textPayload) {
    throw new Error('Модель вернула пустой ответ');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(textPayload);
  } catch (error) {
    throw new Error('Не удалось разобрать ответ модели');
  }

  const data = (parsed ?? {}) as Record<string, unknown>;
  const summary = String(data.summary ?? '').trim();
  const tracksPayload = Array.isArray(data.tracks) ? data.tracks : [];

  if (!tracksPayload.length) {
    throw new Error('Модель не вернула список треков');
  }

  const tracks = tracksPayload.map((track) => normalizeTrack(track)).slice(0, topCount);

  if (!summary) {
    throw new Error('Модель не вернула описание плейлиста');
  }

  return {
    summary,
    tracks
  };
}

export function normalizeSeedTrack(raw: unknown): SeedTrack | null {
  if (typeof raw === 'string') {
    const [title, artist] = raw.split('—').map((item) => item.trim());
    if (title && artist) {
      return { title, artist };
    }
    return null;
  }

  const source = (raw ?? {}) as Record<string, unknown>;
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  const artist = typeof source.artist === 'string' ? source.artist.trim() : '';

  if (!title || !artist) {
    return null;
  }

  return { title, artist };
}

