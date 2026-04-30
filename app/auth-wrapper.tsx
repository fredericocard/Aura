'use client';

import { AuthProvider } from '../lib/auth-context';
import { ActiveGameGuard } from './active-game-guard';

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ActiveGameGuard />
    </AuthProvider>
  );
}
