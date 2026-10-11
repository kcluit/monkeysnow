import { useState, useCallback, useEffect, useRef } from 'react';

type SetValue<T> = T | ((prev: T) => T);

// Every hook on one key in this tab, told of each new value, so that a change made from the
// Settings page or the command palette shows at once in whatever else is mounted
const subscribers = new Map<string, Set<(value: unknown) => void>>();

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

  // The latest value, for updater functions: several sets can come before the next render
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    let keySubscribers = subscribers.get(key);
    if (!keySubscribers) {
      keySubscribers = new Set();
      subscribers.set(key, keySubscribers);
    }
    const onChange = (next: unknown) => setValue(next as T);
    keySubscribers.add(onChange);
    return () => {
      keySubscribers.delete(onChange);
    };
  }, [key]);

  const setStoredValue = useCallback((newValue: SetValue<T>): void => {
    // Allow value to be a function so we have the same API as useState
    const valueToStore = newValue instanceof Function ? newValue(latest.current) : newValue;
    latest.current = valueToStore;
    try {
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // Storage blocked or full: the change still applies, for this visit only
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
    setValue(valueToStore);
    subscribers.get(key)?.forEach((notify) => notify(valueToStore));
  }, [key]);

  return [value, setStoredValue];
}
