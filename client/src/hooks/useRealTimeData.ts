import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface RealTimeOptions {
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface WebSocketMessage {
  type: 'kpi_update' | 'relationship_change' | 'grant_milestone' | 'activity_update';
  tenantId: string;
  data: any;
  timestamp: string;
}

export function useRealTimeConnection(options: RealTimeOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const {
    autoReconnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000
  } = options;

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) return;

    try {
      const socket = io('/', {
        path: '/ws/socket.io',
        autoConnect: false,
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Authenticate with server
        socket.emit('authenticate', {
          userId: user.id,
          tenantId: user.currentTenantId || 'dev-tenant-1',
          email: user.email
        });
      });

      socket.on('authenticated', (response: { status: string; room?: string; message?: string }) => {
        if (response.status === 'success') {
          console.log(`WebSocket authenticated for room: ${response.room}`);
        } else {
          console.error('WebSocket authentication failed:', response.message);
          setError(`Authentication failed: ${response.message}`);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setConnected(false);

        // Auto-reconnect logic
        if (autoReconnect && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${reconnectAttempts})`);
          
          setTimeout(() => {
            socket.connect();
          }, reconnectDelay);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setError(`Connection error: ${error.message}`);
        setConnected(false);
      });

      socketRef.current = socket;
      socket.connect();

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to create connection');
    }
  }, [isAuthenticated, user, autoReconnect, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user, connect, disconnect]);

  return {
    socket: socketRef.current,
    connected,
    error,
    connect,
    disconnect
  };
}

export function useRealTimeData<T>(channel: string, initialData?: T) {
  const { socket, connected } = useRealTimeConnection();
  const { user } = useAuth();
  const [data, setData] = useState<T | undefined>(initialData);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const subscribe = useCallback(() => {
    if (socket && connected && user?.currentTenantId) {
      socket.emit('subscribe', {
        channel,
        tenantId: user.currentTenantId || 'dev-tenant-1'
      });

      socket.on('subscribed', (response: { channel: string; status: string; message?: string }) => {
        if (response.channel === channel) {
          if (response.status === 'success') {
            setIsSubscribed(true);
            console.log(`Subscribed to channel: ${channel}`);
          } else {
            console.error(`Failed to subscribe to ${channel}:`, response.message);
          }
        }
      });
    }
  }, [socket, connected, channel, user?.currentTenantId]);

  const unsubscribe = useCallback(() => {
    if (socket) {
      socket.off('subscribed');
      socket.off('update');
      setIsSubscribed(false);
    }
  }, [socket]);

  useEffect(() => {
    if (connected && socket) {
      subscribe();

      // Listen for updates
      const handleUpdate = (message: WebSocketMessage) => {
        if (message.type.includes(channel) || channel === 'all') {
          setData(message.data);
          setLastUpdate(new Date(message.timestamp));
          console.log(`Received real-time update for ${channel}:`, message.data);
        }
      };

      socket.on('update', handleUpdate);

      return () => {
        socket.off('update', handleUpdate);
        unsubscribe();
      };
    }
  }, [connected, socket, subscribe, unsubscribe, channel]);

  const sendUpdate = useCallback((updateData: any) => {
    if (socket && connected && isSubscribed) {
      socket.emit('update', {
        type: `${channel}_update`,
        payload: updateData
      });
    }
  }, [socket, connected, isSubscribed, channel]);

  return {
    data,
    lastUpdate,
    isSubscribed,
    connected,
    sendUpdate
  };
}

// Specialized hooks for different data types
export function useRealTimeKPIs(initialData?: any) {
  return useRealTimeData('kpis', initialData);
}

export function useRealTimeRelationships(initialData?: any) {
  return useRealTimeData('relationships', initialData);
}

export function useRealTimeGrants(initialData?: any) {
  return useRealTimeData('grants', initialData);
}

export function useRealTimeActivities(initialData?: any) {
  return useRealTimeData('activities', initialData);
}

// Hook for sending real-time updates
export function useRealTimeUpdates() {
  const { socket, connected } = useRealTimeConnection();

  const sendKPIUpdate = useCallback((data: any) => {
    if (socket && connected) {
      socket.emit('update', { type: 'kpi_update', payload: data });
    }
  }, [socket, connected]);

  const sendRelationshipUpdate = useCallback((data: any) => {
    if (socket && connected) {
      socket.emit('update', { type: 'relationship_change', payload: data });
    }
  }, [socket, connected]);

  const sendGrantUpdate = useCallback((data: any) => {
    if (socket && connected) {
      socket.emit('update', { type: 'grant_milestone', payload: data });
    }
  }, [socket, connected]);

  const sendActivityUpdate = useCallback((data: any) => {
    if (socket && connected) {
      socket.emit('update', { type: 'activity_update', payload: data });
    }
  }, [socket, connected]);

  return {
    connected,
    sendKPIUpdate,
    sendRelationshipUpdate,
    sendGrantUpdate,
    sendActivityUpdate
  };
}