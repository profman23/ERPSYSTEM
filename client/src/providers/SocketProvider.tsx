import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { accessToken } = useAuth();

  useEffect(() => {
    // Only connect if we have an access token
    if (!accessToken) {
      // Disconnect if socket exists and token is removed (logout)
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setIsAuthenticated(false);
      }
      return;
    }

    // Dynamic Socket.IO URL for Replit environment
    // Backend ALWAYS runs on port 3000
    const getSocketUrl = () => {
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        // Remove existing port (if any) then add :3000
        const baseWithoutPort = origin.replace(/:\d+$/, '');
        return `${baseWithoutPort}:3000`;
      }
      return 'http://localhost:3000';
    };

    const socketUrl = getSocketUrl();
    console.log('🔧 Socket.IO URL:', socketUrl);
    console.log('🔑 Connecting Socket.IO with authentication...');

    // Create socket with authentication
    const socketInstance = io(socketUrl, {
      autoConnect: true,
      auth: {
        token: accessToken, // Pass JWT token in handshake
      },
    });

    // Connection handlers
    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    // Authentication confirmation from server
    socketInstance.on('authenticated', (data) => {
      console.log('✅ Socket.IO authenticated:', data);
      setIsAuthenticated(true);
    });

    // Error handling
    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    socketInstance.on('error', (error) => {
      console.error('⚠️ Socket.IO error:', error);
    });

    setSocket(socketInstance);

    // Cleanup on unmount or token change
    return () => {
      console.log('🔌 Cleaning up Socket.IO connection...');
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [accessToken]); // Reconnect when accessToken changes

  return (
    <SocketContext.Provider value={{ socket, isConnected, isAuthenticated }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
