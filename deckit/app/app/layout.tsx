import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { StudioProvider } from '@/lib/studio-context';

export const metadata: Metadata = {
  title: 'DeckIt — 資料、できた。',
  description: 'Google Drive ネイティブの資料づくり。Your Slides. Your Drive. Your Style.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <StudioProvider>{children}</StudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
