import { useState, useEffect, useCallback } from 'react';

const usePersistentState = (key, defaultValue, expirationTime = 24 * 60 * 60 * 1000) => {
  const [state, setState] = useState(defaultValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedItem = localStorage.getItem(key);
        if (savedItem) {
          const { value, timestamp } = JSON.parse(savedItem);
          if (Date.now() - timestamp < expirationTime) {
            setState(value);
          } else {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Error loading state from localStorage:', error);
      }
      setIsInitialized(true);
    }
  }, [key, expirationTime]);

  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify({ value: state, timestamp: Date.now() }));
      } catch (error) {
        console.error('Error saving state to localStorage:', error);
      }
    }
  }, [key, state, isInitialized]);

  const clearState = useCallback(() => {
    setState(defaultValue);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }, [key, defaultValue]);

  return [state, setState, clearState, isInitialized];
};

export default usePersistentState;