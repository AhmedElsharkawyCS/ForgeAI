/**
 * Logger utility for SDK with configurable log levels
 */

export type LogLevel = 'info' | 'debug' | 'error' | 'all' | 'none';

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
}

interface LogEntry {
  level: 'info' | 'debug' | 'error';
  message: string;
  data?: unknown;
  timestamp: number;
}

export class Logger {
  private config: Required<LoggerConfig>;
  private history: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level || 'info',
      prefix: config.prefix || '[AI-Agent]',
      timestamp: config.timestamp !== undefined ? config.timestamp : true,
      colors: config.colors !== undefined ? config.colors : true,
    };
  }

  /**
   * Log info level message
   */
  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      this.log('info', message, data);
    }
  }

  /**
   * Log debug level message
   */
  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, data);
    }
  }

  /**
   * Log error level message
   */
  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      this.log('error', message, data);
    }
  }

  /**
   * Get log history
   */
  getHistory(): LogEntry[] {
    return [...this.history];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Update logger configuration
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: 'info' | 'debug' | 'error'): boolean {
    const { level: configLevel } = this.config;

    if (configLevel === 'none') return false;
    if (configLevel === 'all') return true;

    const levels: Record<LogLevel, number> = {
      error: 0,
      info: 1,
      debug: 2,
      all: 3,
      none: -1,
    };

    return levels[level] <= levels[configLevel];
  }

  /**
   * Internal log method
   */
  private log(level: 'info' | 'debug' | 'error', message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
    };

    // Add to history
    this.history.push(entry);

    // Format message
    const formattedMessage = this.formatMessage(entry);

    // Output to console
    this.output(level, formattedMessage, data);
  }

  /**
   * Format log message
   */
  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.config.timestamp) {
      const date = new Date(entry.timestamp);
      const time = date.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const ms = date.getMilliseconds().toString().padStart(3, '0');
      parts.push(`[${time}.${ms}]`);
    }

    // Prefix
    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }

    // Level
    parts.push(`[${entry.level.toUpperCase()}]`);

    // Message
    parts.push(entry.message);

    return parts.join(' ');
  }

  /**
   * Output to console with appropriate method and styling
   */
  private output(level: 'info' | 'debug' | 'error', message: string, data?: unknown): void {
    const colors = {
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[35m',   // Magenta
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m',
    };

    const coloredMessage = this.config.colors 
      ? `${colors[level]}${message}${colors.reset}`
      : message;

    switch (level) {
      case 'info':
        if (data) {
          console.info(coloredMessage, data);
        } else {
          console.info(coloredMessage);
        }
        break;
      case 'debug':
        if (data) {
          console.debug(coloredMessage, data);
        } else {
          console.debug(coloredMessage);
        }
        break;
      case 'error':
        if (data) {
          console.error(coloredMessage, data);
        } else {
          console.error(coloredMessage);
        }
        break;
    }
  }
}

/**
 * Create a child logger with a specific prefix
 */
export function createChildLogger(parent: Logger, prefix: string): Logger {
  const config = (parent as any).config;
  return new Logger({
    ...config,
    prefix: `${config.prefix}:${prefix}`,
  });
}
