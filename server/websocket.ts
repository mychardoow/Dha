import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class WebSocketService {
  private io: SocketIOServer;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
  }

  initialize(): void {
    this.io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
      });

      // Send deployment success message
      socket.emit('system-status', {
        status: 'LIVE',
        message: 'DHA Digital Services is live and operational!',
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ WebSocket service initialized');
  }

  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }
}
import { Server } from 'http';
import { WebSocketServer } from 'ws';

export class WebSocketService {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
  }

  initialize() {
    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      ws.on('message', (message) => {
        console.log('Received:', message.toString());
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to DHA Digital Services'
      }));
    });

    console.log('WebSocket server initialized');
  }
}
