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
