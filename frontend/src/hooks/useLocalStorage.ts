import { useState, useCallback } from 'react';

type SetValue<T> = T | ((prev: T) => T);

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: SetValue<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue: SetValue<T>): void => {
    setValue(prev => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
        return prev;
      }
    });
  }, [key]);

  return [value, setStoredValue];
}
