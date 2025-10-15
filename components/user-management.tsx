'use client';

import { FormEvent, useState } from 'react';

type User = {
  id: number;
  username: string;
  role: string;
  created_at: string;
};

const roles = [
  { value: 'admin', label: 'Администратор' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'bartender', label: 'Бармен' }
];

export default function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('bartender');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Не удалось создать пользователя');
      setLoading(false);
      return;
    }

    const payload = await response.json();
    setUsers((prev) => [payload.user, ...prev]);
    setUsername('');
    setPassword('');
    setRole('bartender');
    setMessage('Пользователь создан');
    setLoading(false);
  }

  async function handleRoleChange(userId: number, newRole: string) {
    const response = await fetch('/api/settings/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Не удалось изменить роль');
      return;
    }

    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)));
    setMessage('Роль обновлена');
    setError('');
  }

  async function handleDelete(userId: number) {
    if (!confirm('Удалить пользователя?')) return;
    const response = await fetch('/api/settings/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Не удалось удалить пользователя');
      return;
    }

    setUsers((prev) => prev.filter((user) => user.id !== userId));
    setMessage('Пользователь удалён');
    setError('');
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-300">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">{error}</div> : null}
      <form onSubmit={handleCreate} className="card-surface grid gap-4 md:grid-cols-4">
        <div className="md:col-span-4">
          <h3 className="text-lg font-semibold text-white">Создать пользователя</h3>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-slate-300" htmlFor="new-username">
            Логин
          </label>
          <input
            id="new-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white focus:border-bar-accent focus:outline-none"
            placeholder="newbartender"
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-sm text-slate-300" htmlFor="new-password">
            Пароль
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white focus:border-bar-accent focus:outline-none"
            placeholder="••••••••"
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-sm text-slate-300" htmlFor="new-role">
            Роль
          </label>
          <select
            id="new-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white focus:border-bar-accent focus:outline-none"
          >
            {roles.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4 flex justify-end">
          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Создаём...' : 'Добавить'}
          </button>
        </div>
      </form>

      <div className="card-surface">
        <h3 className="text-lg font-semibold text-white">Команда</h3>
        <table className="mt-4 min-w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-500">
            <tr className="border-b border-white/5">
              <th className="px-4 py-3">Пользователь</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-4 py-3">Создан</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 text-slate-200">{user.username}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(event) => handleRoleChange(user.id, event.target.value)}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-bar-accent focus:outline-none"
                  >
                    {roles.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(user.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {user.role === 'admin' ? (
                    <span className="text-xs uppercase tracking-wide text-slate-500">Admin</span>
                  ) : (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="rounded-xl border border-red-500/40 px-3 py-2 text-xs uppercase tracking-wide text-red-300 transition hover:bg-red-500/10"
                    >
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Пользователи не найдены.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
