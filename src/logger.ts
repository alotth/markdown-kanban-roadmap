import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  location?: string;
  timestamp: number;
}

class Logger {
  private logDir: string;
  private logFile: string;
  private consoleOutput: boolean;
  private fileOutput: boolean;
  private minLevel: LogLevel;

  constructor(options: {
    logDir?: string;
    logFile?: string;
    consoleOutput?: boolean;
    fileOutput?: boolean;
    minLevel?: LogLevel;
  } = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), '.logs');
    this.logFile = options.logFile || path.join(this.logDir, 'extension.log');
    this.consoleOutput = options.consoleOutput !== false; // default true
    this.fileOutput = options.fileOutput !== false; // default true
    this.minLevel = options.minLevel || LogLevel.DEBUG;

    // Ensure log directory exists; disable file output if we can't create it.
    if (this.fileOutput && !fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (error) {
        this.fileOutput = false;
        if (this.consoleOutput) {
          console.error(`Failed to create log directory: ${error}`);
        }
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const location = entry.location ? ` [${entry.location}]` : '';
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `[${timestamp}] ${entry.level}${location}: ${entry.message}${dataStr}`;
  }

  private writeLog(level: LogLevel, message: string, data?: any, location?: string) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      location,
      timestamp: Date.now()
    };

    const formattedMessage = this.formatMessage(entry);

    // Write to console (always to stderr for VS Code extension host)
    if (this.consoleOutput) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
      }
    }

    // Write to file
    if (this.fileOutput) {
      try {
        fs.appendFileSync(this.logFile, formattedMessage + '\n', 'utf8');
      } catch (error) {
        // Silently fail if file write fails
        if (this.consoleOutput) {
          console.error(`Failed to write log to file: ${error}`);
        }
      }
    }
  }

  debug(message: string, data?: any, location?: string) {
    this.writeLog(LogLevel.DEBUG, message, data, location);
  }

  info(message: string, data?: any, location?: string) {
    this.writeLog(LogLevel.INFO, message, data, location);
  }

  warn(message: string, data?: any, location?: string) {
    this.writeLog(LogLevel.WARN, message, data, location);
  }

  error(message: string, data?: any, location?: string) {
    this.writeLog(LogLevel.ERROR, message, data, location);
  }

  // Convenience method for structured logging
  log(location: string, message: string, data?: any) {
    this.debug(message, data, location);
  }
}

// Helper to get extension path when running in VS Code
function getLogDir(): string {
  // Try to get extension path from VS Code context
  try {
    // @ts-ignore - vscode module may not be available in standalone mode
    const vscode = require('vscode');
    if (vscode && vscode.extensions) {
      const extension =
        vscode.extensions.getExtension('alotth.markdown-kanban-roadmap') ||
        vscode.extensions.getExtension('holooooo.markdown-kanban-roadmap');
      if (extension) {
        return path.join(extension.extensionPath, '.logs');
      }
    }
  } catch (e) {
    // Not running in VS Code, use process.cwd()
  }
  
  // Fallback to process.cwd() or __dirname
  try {
    return path.join(process.cwd(), '.logs');
  } catch (e) {
    // Last resort: use __dirname
    return path.join(__dirname, '..', '.logs');
  }
}

// Create default logger instance
// Can be configured via environment variables
const defaultLogger = new Logger({
  logDir: process.env.MARKDOWN_KANBAN_LOG_DIR || getLogDir(),
  logFile: process.env.MARKDOWN_KANBAN_LOG_FILE,
  consoleOutput: process.env.MARKDOWN_KANBAN_CONSOLE_LOG !== 'false',
  fileOutput: process.env.MARKDOWN_KANBAN_FILE_LOG !== 'false',
  minLevel: (process.env.MARKDOWN_KANBAN_LOG_LEVEL as LogLevel) || LogLevel.DEBUG
});

export const logger = defaultLogger;

// Export for creating custom loggers
export { Logger };
