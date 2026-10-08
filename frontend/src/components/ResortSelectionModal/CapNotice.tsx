import { MAX_SELECTED_RESORTS, type SelectionCapNotice } from '../../hooks/useResortHierarchy';

/** Explains why an add stopped short at the Selection cap. */
export function CapNotice({ notice }: { notice: SelectionCapNotice | null }): JSX.Element | null {
  if (!notice) return null;

  return (
    <span className="resort-selection-cap-notice" role="status">
      {notice.added === 0
        ? `${MAX_SELECTED_RESORTS} resort maximum reached`
        : `Added ${notice.added} of ${notice.requested}: ${MAX_SELECTED_RESORTS} resort maximum`}
    </span>
  );
}
