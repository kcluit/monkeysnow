import { useState, useEffect } from 'react';
import type { DetailUtilityBarProps } from '../../types/detailView';
import type { WeatherModel, WeatherVariable } from '../../types/openMeteo';
import { MODEL_CONFIGS, VARIABLE_CONFIGS, ALL_MODELS, ALL_VARIABLES } from '../../utils/chartConfigurations';

export function DetailUtilityBar({
  selectedModels,
  setSelectedModels,
  selectedVariables,
  setSelectedVariables,
  elevation,
  setElevation,
  onBack,
}: DetailUtilityBarProps): JSX.Element {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
        setShowModelDropdown(false);
        setShowVariableDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleModel = (modelId: WeatherModel) => {
    if (selectedModels.includes(modelId)) {
      // Don't allow removing the last model
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(m => m !== modelId));
      }
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const toggleVariable = (variableId: WeatherVariable) => {
    if (selectedVariables.includes(variableId)) {
      // Don't allow removing the last variable
      if (selectedVariables.length > 1) {
        setSelectedVariables(selectedVariables.filter(v => v !== variableId));
      }
    } else {
      setSelectedVariables([...selectedVariables, variableId]);
    }
  };

  const selectAllVariables = () => {
    setSelectedVariables([...ALL_VARIABLES]);
  };

  const deselectAllVariables = () => {
    // Keep at least one variable
    setSelectedVariables([ALL_VARIABLES[0]]);
  };

  return (
    <div className="mb-6 flex flex-wrap gap-4 items-center">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-secondary hover:bg-theme-cardBg transition-colors text-theme-accent"
      >
        <img src="/2744.webp" alt="" className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="h-6 w-px bg-theme-border" />

      {/* Model Selection Dropdown */}
      <div className="relative" data-dropdown>
        <button
          onClick={() => {
            setShowModelDropdown(!showModelDropdown);
            setShowVariableDropdown(false);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
        >
          <span className="text-sm text-theme-textPrimary">
            Models ({selectedModels.length})
          </span>
          <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showModelDropdown && (
          <div className="absolute left-0 z-20 mt-1 w-64 max-h-80 overflow-y-auto bg-theme-background rounded-lg shadow-lg border border-theme-border">
            <div className="p-2">
              {ALL_MODELS.map(modelId => {
                const config = MODEL_CONFIGS.get(modelId);
                const isSelected = selectedModels.includes(modelId);
                return (
                  <label
                    key={modelId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-theme-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleModel(modelId)}
                      className="w-4 h-4 rounded border-theme-border"
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: config?.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-theme-textPrimary truncate">
                        {config?.name || modelId}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Elevation Input */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-theme-textSecondary">Elevation:</label>
        <input
          type="number"
          value={elevation}
          onChange={(e) => setElevation(Number(e.target.value))}
          className="w-24 px-3 py-2 text-sm rounded-lg bg-theme-background border border-theme-border text-theme-textPrimary focus:outline-none focus:ring-1 focus:ring-theme-accent"
          step={100}
          min={0}
          max={9000}
        />
        <span className="text-sm text-theme-textSecondary">m</span>
      </div>

      <div className="h-6 w-px bg-theme-border" />

      {/* Variable Selection Dropdown */}
      <div className="relative" data-dropdown>
        <button
          onClick={() => {
            setShowVariableDropdown(!showVariableDropdown);
            setShowModelDropdown(false);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-background border border-theme-border hover:bg-theme-secondary transition-colors"
        >
          <span className="text-sm text-theme-textPrimary">
            Variables ({selectedVariables.length})
          </span>
          <svg className="w-4 h-4 text-theme-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showVariableDropdown && (
          <div className="absolute left-0 z-20 mt-1 w-64 max-h-80 overflow-y-auto bg-theme-background rounded-lg shadow-lg border border-theme-border">
            <div className="p-2 border-b border-theme-border flex gap-2">
              <button
                onClick={selectAllVariables}
                className="text-xs px-2 py-1 rounded bg-theme-secondary hover:bg-theme-cardBg text-theme-textPrimary"
              >
                Select All
              </button>
              <button
                onClick={deselectAllVariables}
                className="text-xs px-2 py-1 rounded bg-theme-secondary hover:bg-theme-cardBg text-theme-textPrimary"
              >
                Deselect All
              </button>
            </div>
            <div className="p-2">
              {ALL_VARIABLES.map(varId => {
                const config = VARIABLE_CONFIGS.get(varId);
                const isSelected = selectedVariables.includes(varId);
                return (
                  <label
                    key={varId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-theme-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVariable(varId)}
                      className="w-4 h-4 rounded border-theme-border"
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: config?.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-theme-textPrimary truncate">
                        {config?.label || varId}
                      </div>
                      <div className="text-xs text-theme-textSecondary">
                        {config?.unit || ''}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
