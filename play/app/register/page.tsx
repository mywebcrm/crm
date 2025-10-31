'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'bartender' | 'manager'>('bartender');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Регистрация недоступна');
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
          <h1 className="mt-2 text-3xl font-semibold">Регистрация</h1>
          <p className="mt-2 text-sm text-slate-400">Создайте профиль бармена или менеджера для работы в системе.</p>
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
              placeholder="nightowl"
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
          <div>
            <label className="text-sm text-slate-300" htmlFor="role">
              Роль
            </label>
            <select
              id="role"
              name="role"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-slate-100 focus:border-bar-accent focus:outline-none"
              value={role}
              onChange={(event) => setRole(event.target.value as 'bartender' | 'manager')}
            >
              <option value="bartender">Бармен</option>
              <option value="manager">Менеджер</option>
            </select>
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" className="button-primary w-full" disabled={loading}>
            {loading ? 'Создаём...' : 'Создать аккаунт'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Уже есть аккаунт?{' '}
          <Link href="/" className="font-semibold text-bar-accent">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}
