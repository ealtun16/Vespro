import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console output (colored)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // Error logs - only errors
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d', // Keep logs for 14 days
      maxSize: '20m', // Rotate if file exceeds 20MB
    }),
    
    // Combined logs - all levels
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
    }),
    
    // Excel upload specific logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'excel-upload-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d', // Keep excel logs for 30 days
      maxSize: '50m',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper function to log Excel upload operations
export const logExcelUpload = {
  start: (filename: string, filesize: number) => {
    logger.info('Excel upload started', {
      type: 'excel_upload',
      action: 'start',
      filename,
      filesize,
      timestamp: new Date().toISOString(),
    });
  },
  
  sheetProcessing: (sheetName: string, tankCode: string) => {
    logger.info('Processing sheet', {
      type: 'excel_upload',
      action: 'sheet_processing',
      sheetName,
      tankCode,
    });
  },
  
  tankCreated: (tankId: string, tankCode: string) => {
    logger.info('Tank created', {
      type: 'excel_upload',
      action: 'tank_created',
      tankId,
      tankCode,
    });
  },
  
  itemsImported: (count: number, tankId: string) => {
    logger.info('Items imported', {
      type: 'excel_upload',
      action: 'items_imported',
      count,
      tankId,
    });
  },
  
  success: (filename: string, tankId: string, duration: number) => {
    logger.info('Excel upload completed successfully', {
      type: 'excel_upload',
      action: 'success',
      filename,
      tankId,
      duration,
    });
  },
  
  error: (filename: string, error: Error, context?: any) => {
    logger.error('Excel upload failed', {
      type: 'excel_upload',
      action: 'error',
      filename,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
    });
  },
  
  validationError: (filename: string, field: string, value: any, expected: string) => {
    logger.warn('Validation error in Excel', {
      type: 'excel_upload',
      action: 'validation_error',
      filename,
      field,
      value,
      expected,
    });
  },
  
  cellReadError: (filename: string, cell: string, error: string) => {
    logger.error('Error reading Excel cell', {
      type: 'excel_upload',
      action: 'cell_read_error',
      filename,
      cell,
      error,
    });
  },
};

// Helper function to log API errors with request context
export const logApiError = (
  endpoint: string,
  error: Error,
  req?: any,
  additionalContext?: any
) => {
  logger.error('API Error', {
    type: 'api_error',
    endpoint,
    method: req?.method,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    requestBody: req?.body,
    requestParams: req?.params,
    requestQuery: req?.query,
    userId: req?.session?.userId,
    ...additionalContext,
  });
};

// Helper function to log database errors
export const logDbError = (
  operation: string,
  error: Error,
  query?: string,
  params?: any
) => {
  logger.error('Database Error', {
    type: 'db_error',
    operation,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: (error as any).code, // PostgreSQL error code
    },
    query,
    params,
  });
};

export default logger;
