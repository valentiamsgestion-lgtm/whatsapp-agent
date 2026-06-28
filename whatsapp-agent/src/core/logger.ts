import winston from 'winston'
import { config } from '../config'

export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
      return `${timestamp} [${level}] ${message}${metaStr}`
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.uncolorize(),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.uncolorize(),
    }),
  ],
})
