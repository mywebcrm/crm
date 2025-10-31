import PlaylistGenerator from '@/components/playlist-generator';

export const metadata = {
  title: 'AI плейлист — Бар CRM'
};

export const dynamic = 'force-dynamic';

export default function AiPlaylistPage() {
  return <PlaylistGenerator />;
}

