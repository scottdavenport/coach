/**
 * Production-safe logging utility
 * Provides structured logging with appropriate levels for different environments
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(error && { error: { name: error.name, message: error.message, stack: error.stack } })
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  debug(message: string, context?: Record<string, any>) {
    if (!this.shouldLog('debug')) return;
    const entry = this.formatMessage('debug', message, context);
    console.debug('[DEBUG]', entry);
  }

  info(message: string, context?: Record<string, any>) {
    if (!this.shouldLog('info')) return;
    const entry = this.formatMessage('info', message, context);
    console.info('[INFO]', entry);
  }

  warn(message: string, context?: Record<string, any>) {
    if (!this.shouldLog('warn')) return;
    const entry = this.formatMessage('warn', message, context);
    console.warn('[WARN]', entry);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    if (!this.shouldLog('error')) return;
    const entry = this.formatMessage('error', message, context, error);
    console.error('[ERROR]', entry);
  }

  // API-specific logging methods
  apiRequest(method: string, path: string, userId?: string) {
    this.info(`API ${method} ${path}`, { userId, type: 'api_request' });
  }

  apiResponse(method: string, path: string, status: number, duration?: number) {
    this.info(`API ${method} ${path} - ${status}`, { status, duration, type: 'api_response' });
  }

  apiError(method: string, path: string, error: Error, userId?: string) {
    this.error(`API ${method} ${path} failed`, error, { userId, type: 'api_error' });
  }

  // Database-specific logging
  dbQuery(query: string, duration?: number) {
    this.debug('Database query executed', { query: query.substring(0, 100), duration, type: 'db_query' });
  }

  dbError(query: string, error: Error) {
    this.error('Database query failed', error, { query: query.substring(0, 100), type: 'db_error' });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
