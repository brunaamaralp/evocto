import '@testing-library/jest-dom';

// Mock de APIs globais
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock de matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock de performance.now
Object.defineProperty(performance, 'now', {
  writable: true,
  value: () => Date.now()
});

// Mock de crypto para testes de segurança
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: async (algorithm, data) => {
        // Mock implementation
        const hash = new Uint8Array(32);
        for (let i = 0; i < hash.length; i++) {
          hash[i] = Math.floor(Math.random() * 256);
        }
        return hash;
      }
    }
  }
});

