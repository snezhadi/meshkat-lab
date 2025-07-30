import { headers } from 'next/headers';
import { SimpleThemeToggle } from '@/components/simple-theme-toggle';
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
      {children}
    </>
  );
}
