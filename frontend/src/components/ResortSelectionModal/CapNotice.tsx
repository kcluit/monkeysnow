import { MAX_SELECTED_RESORTS, type SelectionCapNotice } from '../../hooks/useResortHierarchy';
import { useLanguage } from '../../hooks/useLanguage';

/** Explains why an add stopped short at the Selection cap. */
export function CapNotice({ notice }: { notice: SelectionCapNotice | null }): JSX.Element | null {
  const { t } = useLanguage();
  if (!notice) return null;

  return (
    <span className="resort-selection-cap-notice" role="status">
      {notice.added === 0
        ? t('picker.capReached', { max: MAX_SELECTED_RESORTS })
        : t('picker.capPartial', { added: notice.added, requested: notice.requested, max: MAX_SELECTED_RESORTS })}
    </span>
  );
}
