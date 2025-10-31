'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type SeedTrack = {
  title: string;
  artist: string;
};

type GeneratedTrack = {
  title: string;
  artist: string;
  reason: string;
};

type PlaylistSuggestion = {
  summary: string;
  tracks: GeneratedTrack[];
};

type ApiResponse = {
  playlist?: PlaylistSuggestion;
  error?: string;
};

function parseSeedTracks(input: string) {
  const lines = input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const tracks: SeedTrack[] = [];
  const rejected: string[] = [];

  for (const line of lines) {
    const separatorMatch = line.match(/\s[-—–]\s|[-—–]/);

    if (!separatorMatch) {
      rejected.push(line);
      continue;
    }

    const separator = separatorMatch[0];
    const [titleRaw, artistRaw] = line.split(separator);
    const title = (titleRaw ?? '').trim();
    const artist = (artistRaw ?? '').trim();

    if (!title || !artist) {
      rejected.push(line);
      continue;
    }

    tracks.push({ title, artist });
  }

  return { tracks, rejected };
}

function formatSeedPreview(track: SeedTrack) {
  return `${track.title} — ${track.artist}`;
}

export default function PlaylistGenerator() {
  const [rawTracks, setRawTracks] = useState('');
  const [playlistContext, setPlaylistContext] = useState('');
  const [playlist, setPlaylist] = useState<PlaylistSuggestion | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invalidRows, setInvalidRows] = useState<string[]>([]);

  const seedPreview = useMemo(() => parseSeedTracks(rawTracks), [rawTracks]);

  useEffect(() => {
    setInvalidRows([]);
  }, [rawTracks]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPlaylist(null);

    const { tracks, rejected } = seedPreview;
    setInvalidRows(rejected);

    if (!tracks.length) {
      setError('Добавьте хотя бы один трек в формате "Название — Исполнитель"');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ai-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedTracks: tracks,
          playlistContext: playlistContext.trim()
        })
      });

      const payload: ApiResponse | null = await response.json().catch(() => null);

      if (!response.ok || !payload) {
        const message = payload?.error ?? 'Не удалось получить ответ от AI агента';
        throw new Error(message);
      }

      if (!payload.playlist) {
        throw new Error('Пустой ответ от AI агента');
      }

      setPlaylist(payload.playlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <header className="mb-6 space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-bar-accent">AI плейлист</p>
          <h1 className="text-2xl font-semibold text-white">Создать топ из 20 треков</h1>
          <p className="text-sm text-slate-300">
            Вставьте любые треки (одно название на строку в формате «Название — Исполнитель») и
            укажите, какой вайб должен получить итоговый плейлист. AI-агент подберёт свежую двадцатку.
          </p>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="flex flex-col gap-3">
              <div>
                <span className="text-sm font-medium text-white">Исходные треки</span>
                <p className="text-xs text-slate-400">
                  Один трек — одна строка. Разделяйте название и исполнителя тире или дефисом.
                </p>
              </div>
              <textarea
                value={rawTracks}
                onChange={(event) => setRawTracks(event.target.value)}
                placeholder={'Example: \nMidnight City — M83\nChampagne Problems — Taylor Swift'}
                className="min-h-[220px] resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white shadow-inner outline-none transition focus:border-bar-accent focus:ring-2 focus:ring-bar-accent/40"
              />
            </label>

            <label className="flex flex-col gap-3">
              <div>
                <span className="text-sm font-medium text-white">Контекст плейлиста</span>
                <p className="text-xs text-slate-400">
                  Опишите настрой, площадку, событие или аудиторию. Это поможет точнее подобрать композиции.
                </p>
              </div>
              <textarea
                value={playlistContext}
                onChange={(event) => setPlaylistContext(event.target.value)}
                placeholder="Например: Ночной бар в стиле synthwave, гости 25-35 лет, хочется яркий и танцевальный вайб"
                className="min-h-[220px] resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white shadow-inner outline-none transition focus:border-bar-accent focus:ring-2 focus:ring-bar-accent/40"
              />
            </label>
          </div>

          {invalidRows.length > 0 ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="font-medium">Мы пропустили несколько строк — поправьте их вручную:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-100/90">
                {invalidRows.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {seedPreview.tracks.length > 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Подготовленные треки</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
                {seedPreview.tracks.map((track) => (
                  <li
                    key={formatSeedPreview(track)}
                    className="truncate rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                    title={formatSeedPreview(track)}
                  >
                    {formatSeedPreview(track)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full border border-bar-accent bg-bar-accent px-6 py-2 text-sm font-semibold uppercase tracking-widest text-black transition hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:border-white/30 disabled:bg-white/10 disabled:text-slate-400"
            >
              {loading ? 'Анализирую плейлист…' : 'Сгенерировать топ-20'}
            </button>
            <p className="text-xs text-slate-400">
              Результат появится ниже. AI учитывает популярность, тренды и вайб исходных треков.
            </p>
          </div>
        </form>
      </section>

      {playlist ? (
        <section className="rounded-2xl border border-bar-accent/40 bg-black/60 p-8 shadow-2xl">
          <header className="mb-6 space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-bar-accent">Рекомендации</p>
            <h2 className="text-xl font-semibold text-white">{playlist.summary}</h2>
          </header>
          <ol className="space-y-3">
            {playlist.tracks.map((track, index) => (
              <li
                key={`${track.title}-${track.artist}-${index}`}
                className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-100 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bar-accent/20 text-xs font-semibold text-bar-accent">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{track.title}</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">{track.artist}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 md:w-1/2 md:text-right">{track.reason}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

