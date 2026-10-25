import { useEffect, useRef } from 'react';
import { shouldAutoFocusSearch } from '../../utils/autoFocus';
import { useLanguage } from '../../hooks/useLanguage';

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  /** "Search..." in the language showing, if not given */
  placeholder?: string;
  canGoBack: boolean;
  onBack: () => void;
}

export function CommandInput({
  value,
  onChange,
  placeholder,
  canGoBack,
  onBack,
}: CommandInputProps): JSX.Element {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount, unless that would open a phone's keyboard
  useEffect(() => {
    if (inputRef.current && shouldAutoFocusSearch()) {
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
          aria-label={t('command.goBack')}
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
        placeholder={placeholder ?? t('command.search')}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
