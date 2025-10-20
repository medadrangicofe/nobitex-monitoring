// Simple logger wrapper used across project
// Exports default object with info, warn, error methods.
// Timestamp added for clarity.

function ts() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => console.log('[INFO]', ts(), ...args),
  warn: (...args) => console.warn('[WARN]', ts(), ...args),
  error: (...args) => console.error('[ERROR]', ts(), ...args),
  debug: (...args) => console.log('[DEBUG]', ts(), ...args),
};

export default logger;