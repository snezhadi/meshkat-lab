'use client';

import { useEffect, useState } from 'react';

interface UserPermissions {
  canExport: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canEdit: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Get permissions from localStorage (set by AuthGuard)
    if (typeof window !== 'undefined') {
      const storedPermissions = localStorage.getItem('userPermissions');
      const storedUsername = localStorage.getItem('username');

      if (storedPermissions) {
        setPermissions(JSON.parse(storedPermissions));
      }
      if (storedUsername) {
        setUsername(storedUsername);
      }
    }
  }, []);

  return {
    permissions,
    username,
    canExport: permissions?.canExport ?? false,
    canDelete: permissions?.canDelete ?? false,
    canCreate: permissions?.canCreate ?? false,
    canEdit: permissions?.canEdit ?? false,
  };
}
