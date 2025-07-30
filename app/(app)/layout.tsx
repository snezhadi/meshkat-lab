import { headers } from 'next/headers';
import { SimpleThemeToggle } from '@/components/SimpleThemeToggle';
import { getAppConfig, getOrigin } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const hdrs = await headers();
  const origin = getOrigin(hdrs);
  // const { companyName, logo, logoDark } = await getAppConfig(origin);

  return (
    <>
      <header className="fixed top-0 left-0 z-50 hidden w-full flex-row justify-between border-b border-gray-200 bg-white p-2 px-8 md:flex dark:border-gray-600 dark:bg-[#0A0A0A]">
        <div className="flex items-center gap-x-5">
          <img src="/lk-logo.svg" alt="Logo" className="w-26 dark:hidden" />
          <img src="/lk-logo-dark.svg" alt="Logo" className="hidden w-26 dark:block" />
          <div className="flex items-center">
            <div className="mr-4 w-[1px] h-4 bg-gray-500"></div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Session: Employment Agreement</div>
          </div>
        </div>
        <div className="flex items-center gap-x-5">
          <div className="flex items-center gap-x-2">
            <span className="text-sm">Sayyad Nezhadi</span>
            <img data-dropdown-toggle="userDropdown" data-dropdown-placement="bottom-start" id="avatarButton" className="w-7 h-7 p-[1px] rounded-full ring dark:ring-gray-600 ring-gray-400 hover:ring-gray-300 dark:ring-gray-300" src="/avatar.jpg" alt="Bordered avatar" />
          </div>
            <SimpleThemeToggle />
        </div>
      </header>
      {children}
    </>
  );
}
