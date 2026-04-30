'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Preserve any query params and hash fragments (e.g. from OAuth callbacks)
    const search = window.location.search;
    const hash = window.location.hash;
    router.replace('/landing' + search + hash);
  }, [router]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F5EFE2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        fontSize: 14,
        color: '#8A7E6F',
        fontFamily: "'Instrument Sans', sans-serif",
      }}>
        Redirecting...
      </div>
    </div>
  );
}
