'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserPermissions {
  canExport: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canEdit: boolean;
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication...');
        const response = await fetch('/api/auth/session', {
          credentials: 'include', // Ensure cookies are sent
        });
        
        console.log('Session response status:', response.status);
        const data = await response.json();
        console.log('Session response data:', data);

        if (data.authenticated) {
          console.log('User authenticated:', data.user.username);
          setIsAuthenticated(true);
          setUserPermissions(data.user.permissions);
          // Store permissions in a global context or localStorage for easy access
          if (typeof window !== 'undefined') {
            localStorage.setItem('userPermissions', JSON.stringify(data.user.permissions));
            localStorage.setItem('username', data.user.username);
          }
        } else {
          console.log('User not authenticated, redirecting to login');
          setIsAuthenticated(false);
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // This should not be reached due to router.push, but just in case
  return null;
}
