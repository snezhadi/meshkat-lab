'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.push('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <p className="mt-2 text-gray-600">Redirecting to Login...</p>
      </div>
    </div>
  );
}
