'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { THEME_STORAGE_KEY, THEME_MEDIA_QUERY } from '@/lib/utils';

function applyTheme(isDark: boolean) {
  const doc = document.documentElement;
  doc.classList.remove('dark', 'light');

  if (isDark) {
    doc.classList.add('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
  } else {
    doc.classList.add('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
  }
}

interface SimpleThemeToggleProps {
  className?: string;
}

export function SimpleThemeToggle({ className }: SimpleThemeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Get initial theme
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    let initialIsDark = false;

    if (storedTheme === 'dark') {
      initialIsDark = true;
    } else if (storedTheme === 'light') {
      initialIsDark = false;
    } else {
      // System preference
      initialIsDark = window.matchMedia(THEME_MEDIA_QUERY).matches;
    }

    setIsDark(initialIsDark);
    applyTheme(initialIsDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    applyTheme(newIsDark);
  };

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className={`p-0.5 transition-colors ${className}`}>
        <div className="w-3 h-3" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`w-7 h-7 cursor-pointer flex items-center justify-center rounded-full ring dark:ring-gray-600 ring-gray-400 hover:ring-gray-300 dark:ring-gray-300 group transition-colors ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {!isDark ? (
        <SunIcon size={16} weight="bold" className="text-amber-600 group-hover:text-yellow-800 dark:text-yellow-500 " />
      ) : (
        <MoonIcon size={16} weight="bold" className="text-gray-700  dark:group-hover:text-gray-200 dark:text-gray-300" />
      )}
    </button>
  );
}
