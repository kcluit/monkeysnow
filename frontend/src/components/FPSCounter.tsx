import { useLanguage } from '../hooks/useLanguage';

interface FPSCounterProps {
  fps: number;
  isVisible: boolean;
}

export function FPSCounter({ fps, isVisible }: FPSCounterProps): JSX.Element | null {
  const { t } = useLanguage();

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fps-counter">
      <span className="fps-value">{fps}</span>
      <span className="fps-label">{t('app.fps')}</span>
    </div>
  );
}
