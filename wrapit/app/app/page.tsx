import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

export default function HomePage() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
