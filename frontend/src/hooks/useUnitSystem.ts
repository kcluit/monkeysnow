import { useLocalStorage } from './useLocalStorage';
import { detectDefaultUnitSystem, type UnitSystem } from '../utils/unitConversion';

/**
 * Hook for managing the user's preferred unit system (metric/imperial).
 * Automatically detects default based on user locale.
 */
export function useUnitSystem(): [UnitSystem, (system: UnitSystem) => void] {
  return useLocalStorage<UnitSystem>('unitSystem', detectDefaultUnitSystem());
}
