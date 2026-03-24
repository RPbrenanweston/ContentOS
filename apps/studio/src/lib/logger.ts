// @crumb structured-logger-studio
// OBS | Logging | Structured output
// why: Replace ad-hoc console calls with structured JSON logging for observability and log aggregation compatibility
// in:[message: string, meta?: Record<string, unknown>] out:[JSON line to stdout/stderr] err:[none — logger must never throw]
// hazard: Calling logger at module initialization (before env is ready) is safe — no env deps
// edge:./env.ts -> RELATES (env validation companion)
// prompt: Add log level env filter (LOG_LEVEL) to suppress debug in production; consider structured trace/span IDs for distributed tracing

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  requestId?: string
  service: string
  [key: string]: unknown
}

function createLogger(service: string) {
  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service,
      ...meta,
    }
    const output = JSON.stringify(entry)
    if (level === 'error') console.error(output)
    else if (level === 'warn') console.warn(output)
    else console.log(output)
  }

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  }
}

export const logger = createLogger('studio')
