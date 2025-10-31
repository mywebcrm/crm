'use client';

import { FormEvent, useState } from 'react';

interface TrackSuggestion {
  title: string;
  artist: string;
  reason?: string;
}

const DEFAULT_COUNT = 20;

export default function AiPlaylistPage() {
  const [seedInput, setSeedInput] = useState('');
  const [context, setContext] = useState('');
  const [count, setCount] = useState<number>(DEFAULT_COUNT);
  const [suggestions, setSuggestions] = useState<TrackSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setSuggestions([]);
    setGeneratedAt(null);

    try {
      const response = await fetch('/api/ai-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedTracks: seedInput,
          description: context,
          count
        })
      });

      if (!response.ok) {
        const payload = await safeParseJson(await response.text());
        setError((payload && payload.error) || 'Не удалось получить ответ от сервиса.');
        return;
      }

      const data = await response.json();
      if (!Array.isArray(data?.tracks) || data.tracks.length === 0) {
        setError('Ответ не содержит треков. Попробуйте уточнить исходный плейлист.');
        return;
      }

      setSuggestions(data.tracks as TrackSuggestion[]);
      setGeneratedAt(new Date().toLocaleString());
    } catch (requestError) {
      console.error('Failed to generate playlist:', requestError);
      setError('Ошибка при обращении к серверу. Проверьте подключение и повторите попытку.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSeedInput('');
    setContext('');
    setError(null);
    setSuggestions([]);
    setGeneratedAt(null);
  };

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">AI плейлист для сета</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          Вставьте исходный плейлист или набор референсов, опишите атмосферу и получите подобранный топ из 20 треков
          для дальнейшего сведения.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="seedTracks">
              Исходные треки
            </label>
            <textarea
              id="seedTracks"
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              placeholder="Пример:\nBicep - Glue\nFour Tet - Mango Feedback\nCaribou - Never Come Back (Four Tet Remix)"
              className="h-56 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-bar-accent focus:ring-2 focus:ring-bar-accent/40"
              required
            />
            <p className="text-xs text-slate-500">
              Добавляйте по одному треку на строку. Можно вставлять треки в формате «Исполнитель - Название».
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="context">
              Характер плейлиста (опционально)
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Например: более энергично к концу, фокус на breakbeat и мелодичных синтах."
              className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-bar-accent focus:ring-2 focus:ring-bar-accent/40"
            />
          </div>

          <div className="flex flex-col gap-2 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2" htmlFor="trackCount">
              Количество треков
              <input
                id="trackCount"
                type="number"
                min={5}
                max={50}
                value={count}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  setCount(Number.isNaN(parsed) ? DEFAULT_COUNT : parsed);
                }}
                className="w-20 rounded-xl border border-white/10 bg-black/40 px-3 py-1 text-right text-white outline-none transition focus:border-bar-accent focus:ring-2 focus:ring-bar-accent/40"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/30 hover:text-white"
                disabled={loading}
              >
                Очистить
              </button>
              <button
                type="submit"
                className="rounded-full bg-bar-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-bar-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading || !seedInput.trim()}
              >
                {loading ? 'Генерация...' : 'Сгенерировать топ'}
              </button>
            </div>
          </div>

          {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        </form>

        <section className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6">
          <header className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Предложенные треки</h2>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              {generatedAt ? `Обновлено: ${generatedAt}` : 'Сгенерируйте подборку, чтобы увидеть предложения.'}
            </p>
          </header>

          {loading && (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Модель подбирает треки...
            </div>
          )}

          {!loading && suggestions.length === 0 && !error && (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              Здесь появится список рекомендаций.
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <ol className="space-y-3 overflow-y-auto pr-1 text-sm">
              {suggestions.map((track, index) => (
                <li key={`${track.artist}-${track.title}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold tracking-wide">{track.artist}</p>
                      <p className="text-slate-300">{track.title}</p>
                    </div>
                    <span className="rounded-full bg-bar-accent/20 px-3 py-1 text-xs font-semibold text-bar-accent">#{index + 1}</span>
                  </div>
                  {track.reason && <p className="mt-2 text-xs text-slate-400">{track.reason}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function safeParseJson(input: string): { error?: string } | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
