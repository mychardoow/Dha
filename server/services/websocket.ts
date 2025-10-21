import { WebSocket, Server as WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

export class WebSocketService extends EventEmitter {
  private static instance: WebSocketService;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private connectedUsers: Map<string, WebSocket> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(server: any): void {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, data: any): void {
    if (data.type === 'user_connected' && data.userId) {
      this.connectedUsers.set(data.userId, ws);
    }
  }

  broadcastMessage(message: any): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  sendToUser(userId: string, message: any): boolean {
    const ws = this.connectedUsers.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  closeAllConnections(): void {
    this.clients.forEach(client => {
      client.close();
    });
    this.clients.clear();
    this.connectedUsers.clear();
  }
}

export const webSocketService = WebSocketService.getInstance();