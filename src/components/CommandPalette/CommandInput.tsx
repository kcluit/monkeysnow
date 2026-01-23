import { useEffect, useRef } from 'react';

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  canGoBack: boolean;
  onBack: () => void;
}

export function CommandInput({
  value,
  onChange,
  placeholder = 'Search...',
  canGoBack,
  onBack,
}: CommandInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="command-input-wrapper">
      {canGoBack && (
        <button
          type="button"
          className="command-back-btn"
          onClick={onBack}
          aria-label="Go back"
        >
          &lt;
        </button>
      )}
      <input
        ref={inputRef}
        type="text"
        className="command-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
