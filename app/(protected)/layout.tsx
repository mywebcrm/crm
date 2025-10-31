import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/auth';
import LogoutButton from '@/components/logout-button';

export const dynamic = 'force-dynamic';

const navigation = [
  { href: '/home', label: 'Главная' },
  { href: '/sales', label: 'Продажи' },
  { href: '/inventory', label: 'Склад' },
  { href: '/reports', label: 'Отчёты' },
  { href: '/ai-playlist', label: 'AI Плейлист' },
  { href: '/settings', label: 'Настройки' }
];

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-bar-background/95">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-bar-accent">Bar CRM</p>
            <p className="text-lg font-semibold">Привет, {user.username}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <span className="rounded-full border border-bar-accent/40 px-3 py-1 text-bar-accent">
              {user.role}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <nav className="border-b border-white/5 bg-bar-surface/40">
        <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-6 py-3 text-sm">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-transparent px-4 py-2 text-slate-300 transition hover:border-bar-accent hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
