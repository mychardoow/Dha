// Set test environment
process.env.NODE_ENV = 'test';

// Preserve original console for debugging
const originalConsole = { ...console };

// Only mock console in test environment
if (process.env.NODE_ENV === 'test') {
  console.log = (...args) => {};
  console.error = (...args) => {};
  console.warn = (...args) => {};
  console.info = (...args) => {};
  console.debug = (...args) => {};
}