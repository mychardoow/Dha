import axios from 'axios';
import { writeFileSync, readFileSync, existsSync } from 'fs';

interface Alert {
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  service: string;
  resolved: boolean;
}

class AlertSystem {
  private alerts: Alert[] = [];
  private webhookUrl: string;
  private alertHistoryFile = 'alert-history.json';

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl;
    this.loadAlertHistory();
  }

  private loadAlertHistory(): void {
    if (existsSync(this.alertHistoryFile)) {
      try {
        this.alerts = JSON.parse(readFileSync(this.alertHistoryFile, 'utf-8'));
      } catch (error) {
        console.error('Failed to load alert history:', error);
        this.alerts = [];
      }
    }
  }

  private saveAlertHistory(): void {
    try {
      writeFileSync(this.alertHistoryFile, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('Failed to save alert history:', error);
    }
  }

  private async sendWebhookNotification(alert: Alert): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      await axios.post(this.webhookUrl, {
        text: `🚨 ${alert.type.toUpperCase()}: ${alert.message}\nService: ${alert.service}\nTimestamp: ${alert.timestamp}`
      });
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  public async createAlert(
    type: 'error' | 'warning' | 'info',
    message: string,
    service: string
  ): Promise<void> {
    const alert: Alert = {
      type,
      message,
      service,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);
    this.saveAlertHistory();

    if (type === 'error') {
      await this.sendWebhookNotification(alert);
    }

    // Log to console
    console.log(`[${type.toUpperCase()}] ${service}: ${message}`);
  }

  public resolveAlert(service: string, message: string): void {
    const alert = this.alerts.find(
      a => a.service === service && a.message === message && !a.resolved
    );

    if (alert) {
      alert.resolved = true;
      this.saveAlertHistory();
    }
  }

  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  public getAlertHistory(): Alert[] {
    return this.alerts;
  }

  public getServiceStatus(service: string): {
    status: 'healthy' | 'warning' | 'error';
    activeAlerts: Alert[];
  } {
    const activeAlerts = this.alerts.filter(
      alert => alert.service === service && !alert.resolved
    );

    if (activeAlerts.length === 0) {
      return { status: 'healthy', activeAlerts: [] };
    }

    const hasError = activeAlerts.some(alert => alert.type === 'error');
    const hasWarning = activeAlerts.some(alert => alert.type === 'warning');

    return {
      status: hasError ? 'error' : hasWarning ? 'warning' : 'healthy',
      activeAlerts
    };
  }
}

export default AlertSystem;