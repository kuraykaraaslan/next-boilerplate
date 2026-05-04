'use client';
import { useTheme } from 'next-themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-overlay
                 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {theme === 'dark'
        ? <FontAwesomeIcon icon={faSun} className="text-lg" aria-hidden />
        : <FontAwesomeIcon icon={faMoon} className="text-lg" aria-hidden />
      }
    </button>
  );
}
