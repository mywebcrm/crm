'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
    setLoading(false);
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-bar-accent hover:text-white"
    >
      {loading ? 'Выходим...' : 'Выйти'}
    </button>
  );
}
