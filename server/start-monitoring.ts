import HealthMonitor from './monitoring/health-check';
import AlertSystem from './monitoring/alert-system';
import dotenv from 'dotenv';

dotenv.config();

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/dha_prod_db';
const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

async function startMonitoring() {
  console.log('Initializing production monitoring...');
  
  const alertSystem = new AlertSystem(WEBHOOK_URL);
  const monitor = new HealthMonitor(DATABASE_URL, RENDER_URL);
  
  // Handle health check results
  monitor.onStatusChange((status) => {
    if (status.status !== 'healthy') {
      // Check API issues
      Object.entries(status.apis).forEach(([endpoint, api]) => {
        if (api.status === 'down') {
          alertSystem.createAlert(
            'error',
            `API endpoint ${endpoint} is down: ${api.error}`,
            'API'
          );
        }
      });

      // Check database issues
      if (status.database.status === 'down') {
        alertSystem.createAlert(
          'error',
          `Database connection failed: ${status.database.error}`,
          'Database'
        );
      }

      // Check memory usage
      if (status.memory.percentage > 90) {
        alertSystem.createAlert(
          'warning',
          `High memory usage: ${status.memory.percentage.toFixed(2)}%`,
          'System'
        );
      }
    }
  });

  try {
    await monitor.startMonitoring(30000); // Check every 30 seconds
    console.log('Production monitoring started successfully');

    // Initial alert
    await alertSystem.createAlert(
      'info',
      'Production monitoring system initialized successfully',
      'System'
    );
  } catch (error) {
    console.error('Failed to start monitoring:', error);
    await alertSystem.createAlert(
      'error',
      `Monitoring system failed to start: ${error.message}`,
      'System'
    );
    process.exit(1);
  }
}

startMonitoring();