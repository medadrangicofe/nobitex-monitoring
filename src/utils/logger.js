// Simple logger wrapper used across project
// Adds timestamp, log levels, and optional file persistence for critical errors

import fs from 'fs';
import path from 'path';

function ts() {
  return new Date().toISOString();
}

// Optional log level control via .env (default: debug)
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
const LEVELS = ['error', 'warn', 'info', 'success', 'debug'];
const logDir = path.resolve('logs');
const errorLogFile = path.join(logDir, 'error.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Basic terminal color codes (no dependencies)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function shouldLog(level) {
  return LEVELS.indexOf(level) <= LEVELS.indexOf(LOG_LEVEL);
}

const logger = {
  info: (...args) => {
    if (shouldLog('info'))
      console.log(colors.blue + '[INFO]', ts(), ...args, colors.reset);
  },

  warn: (...args) => {
    if (shouldLog('warn'))
      console.warn(colors.yellow + '[WARN]', ts(), ...args, colors.reset);
  },

  error: (...args) => {
    if (shouldLog('error')) {
      console.error(colors.red + '[ERROR]', ts(), ...args, colors.reset);
      const message = `[${ts()}] ${args.join(' ')}\n`;
      fs.appendFileSync(errorLogFile, message);
    }
  },

  debug: (...args) => {
    if (shouldLog('debug'))
      console.log(colors.magenta + '[DEBUG]', ts(), ...args, colors.reset);
  },

  success: (...args) => {
    if (shouldLog('success'))
      console.log(colors.green + '[SUCCESS]', ts(), ...args, colors.reset);
  },
};

export default logger;