'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { canManageGlobalConfig } = usePermissions();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Clear all localStorage and notify other components
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userPermissions');
        localStorage.removeItem('username');
        
        // Clear all localStorage items related to templates and parameters
        Object.keys(localStorage).forEach(key => {
          // Clear parameter-related items
          if (key.startsWith('parameter-filters-template-')) {
            localStorage.removeItem(key);
          }
          // Clear template expansion state
          if (key.startsWith('template-') && (key.includes('-intro-expanded') || key.includes('-clauses-expanded'))) {
            localStorage.removeItem(key);
          }
        });
        localStorage.removeItem('selected-template-id');
        
        window.dispatchEvent(new CustomEvent('userLoginChange'));
      }
      
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    {
      id: 'document-templates',
      label: 'Document Templates',
      href: '/admin/document-templates',
    },
    {
      id: 'document-parameters',
      label: 'Document Parameters',
      href: '/admin/document-parameters',
    },
    ...(canManageGlobalConfig ? [{
      id: 'global-configuration',
      label: 'Global Configuration',
      href: '/admin/global-configuration',
    }] : []),
    // Future menu items can be added here
    // {
    //   id: 'analytics',
    //   label: 'Analytics',
    //   href: '/admin/analytics',
    // },
    // {
    //   id: 'settings',
    //   label: 'Settings',
    //   href: '/admin/settings',
    // },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b bg-white shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img className="h-4 w-auto" src="/lk-logo.svg" alt="MeshkatAI" />
                  <span className="text-gray-600">|</span>
                  <h1 className="text-lg font-bold tracking-wide text-gray-500 uppercase">
                    Document Templates
                  </h1>
                </div>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="min-h-0 w-full border-b bg-white shadow-sm lg:min-h-screen lg:w-64 lg:border-r lg:border-b-0">
            <div className="p-4 lg:p-6">
              <h2 className="mb-4 hidden text-lg font-semibold text-gray-900 lg:block">Menu</h2>
              <nav className="flex space-x-4 lg:flex-col lg:space-y-2 lg:space-x-0">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="min-w-0 flex-1">
            <div className="p-4 lg:p-8">{children}</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
