import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';


afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // storage can be unavailable in some environments; nothing to clear
  }
});