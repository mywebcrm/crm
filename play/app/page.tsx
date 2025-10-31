'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Не удалось войти');
      setLoading(false);
      return;
    }

    router.push('/home');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="card-surface w-full max-w-md space-y-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-bar-accent">Bar CRM</p>
          <h1 className="mt-2 text-3xl font-semibold">Вход в систему</h1>
          <p className="mt-2 text-sm text-slate-400">Используйте логин и пароль, выданные администратором.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300" htmlFor="username">
              Логин
            </label>
            <input
              id="username"
              name="username"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-slate-100 focus:border-bar-accent focus:outline-none"
              placeholder="bartender"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate-300" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              name="password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-slate-100 focus:border-bar-accent focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" className="button-primary w-full" disabled={loading}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Нет аккаунта?{' '}
          <Link href="/register" className="font-semibold text-bar-accent">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </main>
  );
}
