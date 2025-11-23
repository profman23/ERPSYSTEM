import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
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

    const socketInstance = io(socketUrl, {
      autoConnect: true,
    });

    setSocket(socketInstance);
    socketInstance.connect();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
