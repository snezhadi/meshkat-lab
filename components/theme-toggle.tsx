'use client';

import { useEffect, useState } from 'react';
import { MonitorIcon, MoonIcon, SunIcon, LightningIcon } from '@phosphor-icons/react';
import type { ThemeMode } from '@/lib/types';
import { THEME_MEDIA_QUERY, THEME_STORAGE_KEY, cn } from '@/lib/utils';

const THEME_SCRIPT = `
  const doc = document.documentElement;
  const theme = localStorage.getItem("${THEME_STORAGE_KEY}") ?? "system";

  if (theme === "system") {
    if (window.matchMedia("${THEME_MEDIA_QUERY}").matches) {
      doc.classList.add("dark");
    } else {
      doc.classList.add("light");
    }
  } else {
    doc.classList.add(theme);
  }
`
  .trim()
  .replace(/\n/g, '')
  .replace(/\s+/g, ' ');

function applyTheme(theme: ThemeMode) {
  const doc = document.documentElement;

  doc.classList.remove('dark', 'light');
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  if (theme === 'system') {
    if (window.matchMedia(THEME_MEDIA_QUERY).matches) {
      doc.classList.add('dark');
    } else {
      doc.classList.add('light');
    }
  } else {
    doc.classList.add(theme);
  }
}

interface ThemeToggleProps {
  className?: string;
}

export function ApplyThemeScript() {
  return <script id="theme-script">{THEME_SCRIPT}</script>;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode | undefined>(undefined);

  useEffect(() => {
    const storedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) ?? 'system';

    setTheme(storedTheme);
  }, []);

  function handleThemeChange(theme: ThemeMode) {
    applyTheme(theme);
    setTheme(theme);
  }

  return (
    <div
      className={cn(
        'text-foreground bg-background flex w-full flex-row justify-end divide-x overflow-hidden rounded-full border group hover:shadow-lg transition-all duration-300',
        className
      )}
    >
      <span className="sr-only">Color scheme toggle</span>
      <button
        type="button"
        onClick={() => handleThemeChange('dark')}
        className="cursor-pointer p-1 pl-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 relative group/dark"
      >
        <span className="sr-only">Enable dark color scheme</span>
        <MoonIcon size={16} weight="bold" className={cn(theme !== 'dark' && 'opacity-25', 'group-hover/dark:scale-110 transition-transform duration-200')} />
        {theme === 'dark' && (
          <LightningIcon size={8} weight="bold" className="absolute -top-0.5 -right-0.5 text-yellow-400 animate-pulse" />
        )}
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange('light')}
        className="cursor-pointer px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 relative group/light"
      >
        <span className="sr-only">Enable light color scheme</span>
        <SunIcon size={16} weight="bold" className={cn(theme !== 'light' && 'opacity-25', 'group-hover/light:scale-110 transition-transform duration-200')} />
        {theme === 'light' && (
          <LightningIcon size={8} weight="bold" className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
        )}
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange('system')}
        className="cursor-pointer p-1 pr-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 relative group/system"
      >
        <span className="sr-only">Enable system color scheme</span>
        <MonitorIcon size={16} weight="bold" className={cn(theme !== 'system' && 'opacity-25', 'group-hover/system:scale-110 transition-transform duration-200')} />
        {theme === 'system' && (
          <LightningIcon size={8} weight="bold" className="absolute -top-0.5 -right-0.5 text-blue-400 animate-pulse" />
        )}
      </button>
    </div>
  );
}
