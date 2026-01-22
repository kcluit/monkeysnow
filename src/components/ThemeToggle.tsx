import { useTheme } from '../hooks/useTheme';

export function ThemeToggle(): JSX.Element {
  const { theme, toggleTheme, isDark } = useTheme();

  const handleClick = (): void => {
    console.log('Theme toggle clicked, current theme:', theme);
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className="relative inline-flex h-11 w-[72px] md:h-8 md:w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl active:scale-95"
      style={{
        backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA'
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {/* Toggle Circle */}
      <span
        className={`inline-block h-8 w-8 md:h-6 md:w-6 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center ${
          isDark
            ? 'translate-x-[36px] md:translate-x-[30px]'
            : 'translate-x-[3px] md:translate-x-[2px]'
        }`}
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Icon */}
        {isDark ? (
          // Moon icon
          <svg
            width="14"
            height="14"
            className="md:w-3 md:h-3"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="#6B7280"
            />
          </svg>
        ) : (
          // Sun icon
          <svg
            width="14"
            height="14"
            className="md:w-3 md:h-3"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="4" fill="#F59E0B"/>
            <path
              d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M17.36 17.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M17.36 6.64l1.42-1.42"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
