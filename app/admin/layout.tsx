'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AuthGuard from '@/components/auth-guard';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    {
      id: 'document-parameters',
      label: 'Document Parameters',
      href: '/admin/document-parameters',
    },
    {
      id: 'document-templates',
      label: 'Document Templates',
      href: '/admin/document-templates',
    },
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
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <img
                  className="h-4 w-auto"
                  src="/lk-logo.svg"
                  alt="MeshkatAI"
                />
                <span className="text-gray-600">|</span>
                <h1 className="text-lg font-bold text-gray-500 uppercase tracking-wide">Document Templates</h1>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="w-full lg:w-64 bg-white shadow-sm border-b lg:border-b-0 lg:border-r min-h-0 lg:min-h-screen">
          <div className="p-4 lg:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 hidden lg:block">Menu</h2>
            <nav className="flex lg:flex-col space-x-4 lg:space-x-0 lg:space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`block px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium ${
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
        <div className="flex-1 min-w-0">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </div>
      </div>
      </div>
    </AuthGuard>
  );
} 