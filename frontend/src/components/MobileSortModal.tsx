import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SortOption, SortDay, SortDayData } from '../types';

interface MobileSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSort: SortOption;
  setSelectedSort: (sort: SortOption) => void;
  selectedSortDay: SortDay;
  setSelectedSortDay: (day: SortDay) => void;
  sortDayData: SortDayData;
  sortDayText: string;
  isReversed: boolean;
  setIsReversed: (reversed: boolean) => void;
}

export function MobileSortModal({
  isOpen,
  onClose,
  selectedSort,
  setSelectedSort,
  selectedSortDay,
  setSelectedSortDay,
  sortDayData,
  isReversed,
  setIsReversed,
}: MobileSortModalProps): JSX.Element | null {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="command-palette-backdrop" style={{ alignItems: 'flex-end', paddingTop: 0 }} onClick={handleBackdropClick}>
      <div className="sort-filter-modal">
        {/* Header */}
        <div className="sort-filter-header">
          <h2 className="sort-filter-title">Sort & Filter</h2>
          <button onClick={onClose} className="sort-filter-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="sort-filter-content">
          {/* Sort By */}
          <div className="sort-filter-section">
            <h3 className="sort-filter-section-title">Sort by</h3>
            <div className="sort-filter-options-grid">
              {(['temperature', 'snowfall', 'wind'] as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedSort(option)}
                  className={`sort-filter-option ${selectedSort === option ? 'selected' : ''}`}
                >
                  {option === 'temperature' ? 'Temperature' : option === 'snowfall' ? 'Snowfall' : 'Wind'}
                </button>
              ))}
            </div>
          </div>

          {/* Within (Sort Day) */}
          <div className="sort-filter-section">
            <h3 className="sort-filter-section-title">Within</h3>
            <div className="sort-filter-day-list">
              {sortDayData.specialOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedSortDay(option.value as SortDay)}
                  className={`sort-filter-day-option ${selectedSortDay === option.value ? 'selected' : ''}`}
                >
                  {option.name}
                </button>
              ))}
              {sortDayData.regularDays.length > 0 && (
                <div className="sort-filter-separator" />
              )}
              {sortDayData.regularDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedSortDay(index)}
                  className={`sort-filter-day-option ${selectedSortDay === index ? 'selected' : ''}`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>

          {/* Order */}
          <div className="sort-filter-section">
            <h3 className="sort-filter-section-title">Order</h3>
            <div className="sort-filter-options-grid sort-filter-options-2col">
              <button
                onClick={() => setIsReversed(false)}
                className={`sort-filter-option ${!isReversed ? 'selected' : ''}`}
              >
                Descending
              </button>
              <button
                onClick={() => setIsReversed(true)}
                className={`sort-filter-option ${isReversed ? 'selected' : ''}`}
              >
                Ascending
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sort-filter-footer">
          <button onClick={onClose} className="chart-settings-btn apply">
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
