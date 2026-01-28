import { memo, useCallback } from 'react';
import type { VariableCategory } from '../../data/variableCategories';
import type { WeatherVariable } from '../../types/openMeteo';
import { VARIABLE_CONFIGS } from '../../utils/chartConfigurations';

interface VariableCategorySectionProps {
  category: VariableCategory;
  variables: WeatherVariable[];
  isSelected: (v: WeatherVariable) => boolean;
  onToggle: (v: WeatherVariable) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function VariableCategorySectionInner({
  category,
  variables,
  isSelected,
  onToggle,
  isExpanded,
  onToggleExpand,
}: VariableCategorySectionProps): JSX.Element {
  const selectedCount = variables.filter(v => isSelected(v)).length;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand();
    }
  }, [onToggleExpand]);

  return (
    <div className="variable-category">
      <div
        className="variable-category-header"
        onClick={onToggleExpand}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <span className={`variable-category-toggle ${isExpanded ? 'expanded' : ''}`}>
          ▶
        </span>
        <span className="variable-category-name">{category.name}</span>
        <span className="variable-category-count">
          {selectedCount}/{variables.length}
        </span>
      </div>
      {isExpanded && (
        <div className="variable-category-grid">
          {variables.map(variable => {
            const config = VARIABLE_CONFIGS.get(variable);
            const selected = isSelected(variable);
            return (
              <label
                key={variable}
                className={`variable-card ${selected ? 'variable-card-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(variable)}
                  className="variable-card-checkbox"
                />
                <span
                  className="variable-card-color"
                  style={{ backgroundColor: config?.color }}
                />
                <span className="variable-card-label">
                  {config?.label || variable}
                </span>
                {config?.unit && (
                  <span className="variable-card-unit">{config.unit}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const VariableCategorySection = memo(VariableCategorySectionInner);
