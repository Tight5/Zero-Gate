import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { isAuthenticated } from './replitAuth';

interface WebSocketMessage {
  type: 'kpi_update' | 'relationship_change' | 'grant_milestone' | 'activity_update';
  tenantId: string;
  data: any;
  timestamp: Date;
}

interface AuthenticatedSocket {
  userId: string;
  tenantId: string;
  email: string;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === "development" ? "http://localhost:5000" : false,
        methods: ["GET", "POST"]
      },
      path: '/ws/socket.io'
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // Authentication for WebSocket connections
      socket.on('authenticate', async (data: { userId: string; tenantId: string; email: string }) => {
        try {
          // In development, accept all connections
          if (process.env.NODE_ENV === "development") {
            this.connectedUsers.set(socket.id, {
              userId: data.userId || 'dev-user-1',
              tenantId: data.tenantId || 'dev-tenant-1',
              email: data.email || 'admin@tight5digital.com'
            });
            
            // Join tenant-specific room
            const tenantRoom = `tenant:${data.tenantId || 'dev-tenant-1'}`;
            socket.join(tenantRoom);
            
            socket.emit('authenticated', { status: 'success', room: tenantRoom });
            console.log(`Socket ${socket.id} authenticated for tenant: ${data.tenantId || 'dev-tenant-1'}`);
          } else {
            // Production authentication would go here
            socket.emit('authenticated', { status: 'error', message: 'Authentication required' });
          }
        } catch (error) {
          console.error('WebSocket authentication error:', error);
          socket.emit('authenticated', { status: 'error', message: 'Authentication failed' });
        }
      });

      // Handle real-time data subscription
      socket.on('subscribe', (data: { channel: string; tenantId: string }) => {
        const userAuth = this.connectedUsers.get(socket.id);
        if (userAuth && userAuth.tenantId === data.tenantId) {
          const channelRoom = `${data.tenantId}:${data.channel}`;
          socket.join(channelRoom);
          console.log(`Socket ${socket.id} subscribed to channel: ${channelRoom}`);
          socket.emit('subscribed', { channel: data.channel, status: 'success' });
        } else {
          socket.emit('subscribed', { channel: data.channel, status: 'error', message: 'Unauthorized' });
        }
      });

      // Handle real-time data updates from client
      socket.on('update', (data: { type: string; payload: any }) => {
        const userAuth = this.connectedUsers.get(socket.id);
        if (userAuth) {
          this.broadcastUpdate({
            type: data.type as any,
            tenantId: userAuth.tenantId,
            data: data.payload,
            timestamp: new Date()
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
        this.connectedUsers.delete(socket.id);
      });
    });
  }

  // Broadcast updates to specific tenant
  public broadcastToTenant(tenantId: string, message: WebSocketMessage) {
    const tenantRoom = `tenant:${tenantId}`;
    this.io.to(tenantRoom).emit('update', message);
    console.log(`Broadcasted ${message.type} to tenant: ${tenantId}`);
  }

  // Broadcast updates to specific channel within tenant
  public broadcastToChannel(tenantId: string, channel: string, message: WebSocketMessage) {
    const channelRoom = `${tenantId}:${channel}`;
    this.io.to(channelRoom).emit('update', message);
    console.log(`Broadcasted ${message.type} to channel: ${channelRoom}`);
  }

  // Generic broadcast update
  public broadcastUpdate(message: WebSocketMessage) {
    this.broadcastToTenant(message.tenantId, message);
  }

  // Send KPI updates
  public sendKPIUpdate(tenantId: string, kpiData: any) {
    this.broadcastToChannel(tenantId, 'kpis', {
      type: 'kpi_update',
      tenantId,
      data: kpiData,
      timestamp: new Date()
    });
  }

  // Send relationship updates
  public sendRelationshipUpdate(tenantId: string, relationshipData: any) {
    this.broadcastToChannel(tenantId, 'relationships', {
      type: 'relationship_change',
      tenantId,
      data: relationshipData,
      timestamp: new Date()
    });
  }

  // Send grant milestone updates
  public sendGrantUpdate(tenantId: string, grantData: any) {
    this.broadcastToChannel(tenantId, 'grants', {
      type: 'grant_milestone',
      tenantId,
      data: grantData,
      timestamp: new Date()
    });
  }

  // Send activity feed updates
  public sendActivityUpdate(tenantId: string, activityData: any) {
    this.broadcastToChannel(tenantId, 'activities', {
      type: 'activity_update',
      tenantId,
      data: activityData,
      timestamp: new Date()
    });
  }

  // Get connected users count for tenant
  public getConnectedUsers(tenantId: string): number {
    const tenantRoom = `tenant:${tenantId}`;
    const room = this.io.sockets.adapter.rooms.get(tenantRoom);
    return room ? room.size : 0;
  }

  // Get WebSocket stats
  public getStats() {
    return {
      totalConnections: this.connectedUsers.size,
      connectedTenants: Array.from(this.connectedUsers.values()).reduce((acc, user) => {
        acc.add(user.tenantId);
        return acc;
      }, new Set()).size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys())
    };
  }
}

// Singleton instance
let webSocketManager: WebSocketManager | null = null;

export function initializeWebSocket(httpServer: HTTPServer): WebSocketManager {
  if (!webSocketManager) {
    webSocketManager = new WebSocketManager(httpServer);
    console.log('WebSocket server initialized');
  }
  return webSocketManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return webSocketManager;
}