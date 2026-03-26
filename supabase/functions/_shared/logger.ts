/**
 * Structured logging utility for Supabase Edge Functions
 * Provides consistent logging with automatic PII redaction
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  functionName?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  data?: any;
  error?: any;
}

/**
 * Sensitive field patterns to redact
 */
const SENSITIVE_PATTERNS = {
  email: /^(.)[^@]*(@.+)$/,
  phone: /^(.{0,2})(.*)(.{4})$/,
  apiKey: /.*/,
  password: /.*/,
  token: /.*/,
  ssn: /.*/,
  creditCard: /.*/,
};

/**
 * Fields that should be completely redacted
 */
const REDACT_FIELDS = new Set([
  'password',
  'apiKey',
  'api_key',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'secret',
  'ssn',
  'creditCard',
  'credit_card',
  'cvv',
  'pin',
]);

/**
 * Fields that should be partially redacted
 */
const PARTIAL_REDACT_FIELDS = new Set([
  'email',
  'phone',
  'name',
  'firstName',
  'first_name',
  'lastName',
  'last_name',
  'address',
]);

/**
 * Redacts sensitive information from a value
 */
function redactValue(key: string, value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  const lowerKey = key.toLowerCase();

  // Complete redaction for sensitive fields
  if (REDACT_FIELDS.has(key) || lowerKey.includes('password') || lowerKey.includes('secret')) {
    return '[REDACTED]';
  }

  // Partial redaction for PII
  if (typeof value === 'string') {
    if (PARTIAL_REDACT_FIELDS.has(key)) {
      if (lowerKey.includes('email')) {
        // Show only domain: user@example.com -> u***@example.com
        const match = value.match(SENSITIVE_PATTERNS.email);
        return match ? `${match[1]}***${match[2]}` : '[EMAIL]';
      }
      
      if (lowerKey.includes('phone')) {
        // Show only last 4 digits: +31612345678 -> ***5678
        const digits = value.replace(/\D/g, '');
        return digits.length > 4 ? `***${digits.slice(-4)}` : '***';
      }
      
      if (lowerKey.includes('name')) {
        // Show only first character: John -> J***
        return value.length > 0 ? `${value[0]}***` : '***';
      }
      
      if (lowerKey.includes('address')) {
        // Show only first few characters
        return value.length > 5 ? `${value.substring(0, 5)}***` : '***';
      }
    }
  }

  return value;
}

/**
 * Recursively redacts sensitive fields from an object
 */
function redactObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, depth + 1));
  }

  const redacted: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value, depth + 1);
    } else {
      redacted[key] = redactValue(key, value);
    }
  }

  return redacted;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private functionName: string;
  private defaultContext: LogContext;

  constructor(functionName: string, defaultContext: LogContext = {}) {
    this.functionName = functionName;
    this.defaultContext = { functionName, ...defaultContext };
  }

  /**
   * Creates a log entry with consistent formatting
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    error?: any,
    context?: LogContext
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
      data: data ? redactObject(data) : undefined,
      error: error ? this.formatError(error) : undefined,
    };
  }

  /**
   * Formats error objects for logging
   */
  private formatError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace
      };
    }
    return redactObject(error);
  }

  /**
   * Outputs log entry to console
   */
  private output(entry: LogEntry): void {
    const logLine = JSON.stringify(entry, null, 0);
    
    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(logLine);
        break;
      case 'warn':
        console.warn(logLine);
        break;
      case 'error':
        console.error(logLine);
        break;
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: any, context?: LogContext): void {
    this.output(this.createLogEntry('debug', message, data, undefined, context));
  }

  /**
   * Info level logging
   */
  info(message: string, data?: any, context?: LogContext): void {
    this.output(this.createLogEntry('info', message, data, undefined, context));
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: any, context?: LogContext): void {
    this.output(this.createLogEntry('warn', message, data, undefined, context));
  }

  /**
   * Error level logging
   */
  error(message: string, error?: any, data?: any, context?: LogContext): void {
    this.output(this.createLogEntry('error', message, data, error, context));
  }

  /**
   * Log API request
   */
  logRequest(req: Request, context?: LogContext): void {
    this.info('Incoming request', {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers.get('content-type'),
        'user-agent': req.headers.get('user-agent'),
      },
    }, context);
  }

  /**
   * Log API response
   */
  logResponse(status: number, data?: any, context?: LogContext): void {
    this.info('Outgoing response', {
      status,
      hasData: !!data,
    }, context);
  }

  /**
   * Log external API call
   */
  logExternalCall(service: string, endpoint: string, method: string, context?: LogContext): void {
    this.info('External API call', {
      service,
      endpoint,
      method,
    }, context);
  }

  /**
   * Log database operation
   */
  logDbOperation(operation: string, table: string, context?: LogContext): void {
    this.debug('Database operation', {
      operation,
      table,
    }, context);
  }
}

/**
 * Creates a logger instance for an edge function
 */
export function createLogger(functionName: string, context?: LogContext): Logger {
  return new Logger(functionName, context);
}
