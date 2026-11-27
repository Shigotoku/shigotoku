import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { StudioProvider } from '@/lib/studio-context';

export const metadata: Metadata = {
  title: 'WrapIt — 動画、仕上がった。',
  description: '会社のブランドとルールを守って、ショート動画を量産。Your Brand. Your Rules. Wrapped.',
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
