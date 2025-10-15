import Link from 'next/link';
import UserManagement from '@/components/user-management';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const users = await prisma.user.findMany({
    orderBy: { created_at: 'desc' }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Настройки</h1>
        <p className="text-sm text-slate-400">Управляйте доступами, делайте резервные копии и перезаполняйте демо-данные.</p>
      </div>

      <UserManagement initialUsers={users.map((user) => ({ ...user, created_at: user.created_at.toISOString() }))} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card-surface space-y-3">
          <h3 className="text-lg font-semibold text-white">Экспорт данных</h3>
          <p className="text-sm text-slate-400">Скачайте архив с текущими пользователями, коктейлями и остатками.</p>
          <Link href="/api/backup" className="button-primary w-fit">
            Скачать JSON
          </Link>
        </div>
        <div className="card-surface space-y-3">
          <h3 className="text-lg font-semibold text-white">Сброс демо</h3>
          <p className="text-sm text-slate-400">Заново примените seed-данные для презентации. Функция полезна на Vercel.</p>
          <form action="/api/backup" method="post">
            <input type="hidden" name="action" value="reset" />
            <button type="submit" className="button-primary w-fit bg-red-500 hover:bg-red-400">
              Перезаполнить базу
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
