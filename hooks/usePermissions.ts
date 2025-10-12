'use client';

import { useEffect, useState, useCallback } from 'react';

interface UserPermissions {
  canExport: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canManageGlobalConfig: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const loadPermissions = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedPermissions = localStorage.getItem('userPermissions');
      const storedUsername = localStorage.getItem('username');

      if (storedPermissions) {
        setPermissions(JSON.parse(storedPermissions));
      } else {
        setPermissions(null);
      }
      if (storedUsername) {
        setUsername(storedUsername);
      } else {
        setUsername(null);
      }
    }
  }, []);

  useEffect(() => {
    // Load permissions initially
    loadPermissions();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userPermissions' || e.key === 'username') {
        loadPermissions();
      }
    };

    // Listen for custom events (when user logs in/out in same tab)
    const handleLoginChange = () => {
      loadPermissions();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('userLoginChange', handleLoginChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('userLoginChange', handleLoginChange);
      };
    }
  }, [loadPermissions]);

  return {
    permissions,
    username,
    canExport: permissions?.canExport ?? false,
    canDelete: permissions?.canDelete ?? false,
    canCreate: permissions?.canCreate ?? false,
    canEdit: permissions?.canEdit ?? false,
    canManageGlobalConfig: permissions?.canManageGlobalConfig ?? (permissions === null ? null : false),
    refreshPermissions: loadPermissions,
  };
}
