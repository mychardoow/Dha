import winston from 'winston';

export class Logger {
  private logger: winston.Logger;
  
  constructor(private context: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'dha-verification', context },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      this.logger.add(
        new winston.transports.File({ 
          filename: 'error.log',
          level: 'error',
          dirname: 'logs'
        })
      );
      
      this.logger.add(
        new winston.transports.File({
          filename: 'combined.log',
          dirname: 'logs'
        })
      );
    }
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  alert(message: string, meta?: any) {
    this.logger.error(message, {
      ...meta,
      alert: true,
      severity: 'high'
    });
  }

  critical(message: string, meta?: any) {
    this.logger.error(message, {
      ...meta,
      alert: true,
      severity: 'critical'
    });
  }

  audit(action: string, meta: any) {
    this.logger.info(`AUDIT: ${action}`, {
      ...meta,
      audit: true,
      timestamp: new Date().toISOString()
    });
  }
}