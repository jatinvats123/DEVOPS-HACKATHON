import winston from 'winston';

const { combine, timestamp, printf, colorize, align, errors, json } =
  winston.format;

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Readable for a developer watching a terminal.
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  align(),
  printf((info) => {
    const { timestamp, level, message, ...args } = info;
    const ts = timestamp.slice(0, 19).replace('T', ' ');

    let meta = '';
    if (Object.keys(args).length > 0) {
      meta = `\n${JSON.stringify(args, null, 2)}`;
    }

    return `[${ts}] ${level}: ${message}${meta}`;
  })
);

// Structured, for anything that will be parsed.
const structuredFormat = combine(errors({ stack: true }), timestamp(), json());

const isProduction = process.env.NODE_ENV === 'production';

/**
 * File logging is OPT-IN. Two reasons it used to be the default and should not
 * be:
 *
 *  - In a container, log files are written into the image's writable layer:
 *    invisible to `docker logs`, invisible to the platform's log stream, and
 *    discarded when the container is replaced. The logs most worth having —
 *    the ones from the crash that caused the restart — are exactly the ones
 *    lost.
 *  - Creating `logs/` requires write access to the working directory. Once the
 *    container stopped running as root, winston's File transport failed with
 *    EACCES at import time and the process crash-looped before serving a single
 *    request.
 */
const logToFile = process.env.LOG_TO_FILE === 'true';

const transports = [
  // ALWAYS log to stdout/stderr. This was previously added only when NODE_ENV
  // was *not* production, which meant the deployed service emitted nothing at
  // all to `docker logs` or the platform log viewer — the one environment where
  // logs actually matter.
  new winston.transports.Console({
    format: isProduction ? structuredFormat : consoleFormat,
  }),
];

if (logToFile) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  levels: logLevels,
  format: structuredFormat,
  transports,
  // Tests assert on behaviour, not log output; keep their output readable.
  silent:
    process.env.NODE_ENV === 'test' && process.env.LOG_IN_TESTS !== 'true',
});

export default logger;
