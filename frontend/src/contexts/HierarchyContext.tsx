import { createContext, useContext, ReactNode } from 'react';
import {
  useHierarchyData,
  UseHierarchyDataReturn,
} from '../hooks/useHierarchyData';

// Re-export types for convenience
export type { ContinentData, CountryData, ProvinceData, ResortInfo, HierarchyNode, HierarchyNodeType } from '../hooks/useHierarchyData';

interface HierarchyContextValue extends UseHierarchyDataReturn {}

const HierarchyContext = createContext<HierarchyContextValue | null>(null);

interface HierarchyProviderProps {
  children: ReactNode;
}

export function HierarchyProvider({ children }: HierarchyProviderProps) {
  const hierarchyData = useHierarchyData();

  return (
    <HierarchyContext.Provider value={hierarchyData}>
      {children}
    </HierarchyContext.Provider>
  );
}

export function useHierarchy(): HierarchyContextValue {
  const context = useContext(HierarchyContext);
  if (!context) {
    throw new Error('useHierarchy must be used within a HierarchyProvider');
  }
  return context;
}
