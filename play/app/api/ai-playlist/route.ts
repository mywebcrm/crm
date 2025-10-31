import { NextRequest, NextResponse } from 'next/server';
import { generatePlaylist, normalizeSeedTrack } from '@/lib/ai-playlist';

type RequestPayload = {
  seedTracks?: unknown;
  playlistContext?: unknown;
  topCount?: unknown;
};

export async function POST(request: NextRequest) {
  let payload: RequestPayload | null = null;

  try {
    payload = (await request.json()) as RequestPayload;
  } catch (error) {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }

  const seedTracksRaw = Array.isArray(payload?.seedTracks) ? payload?.seedTracks : [];
  const seedTracks = seedTracksRaw
    .map((item) => normalizeSeedTrack(item))
    .filter((item): item is NonNullable<ReturnType<typeof normalizeSeedTrack>> => Boolean(item));

  if (!seedTracks.length) {
    return NextResponse.json({ error: 'Добавьте хотя бы один трек в список' }, { status: 400 });
  }

  const playlistContext = typeof payload?.playlistContext === 'string' ? payload?.playlistContext : '';
  const topCount = typeof payload?.topCount === 'number' ? payload?.topCount : undefined;

  try {
    const playlist = await generatePlaylist({
      seedTracks,
      playlistContext,
      topCount
    });

    return NextResponse.json({ playlist });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'OPENAI_API_KEY is not configured') {
        return NextResponse.json(
          {
            error: 'AI агент не настроен: добавьте ключ OPENAI_API_KEY в переменные окружения'
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Не удалось сгенерировать плейлист' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

