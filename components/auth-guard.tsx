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
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data.authenticated) {
          setIsAuthenticated(true);
          setUserPermissions(data.user.permissions);
          // Store permissions in a global context or localStorage for easy access
          if (typeof window !== 'undefined') {
            localStorage.setItem('userPermissions', JSON.stringify(data.user.permissions));
            localStorage.setItem('username', data.user.username);
          }
        } else {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
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
