import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import io, { Socket } from "socket.io-client";

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
}

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Get authentication token from localStorage or another secure source
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      setError("Authentication token not found");
      return;
    }

    // Initialize socket connection
    const socketInstance = io(window.location.origin, {
      auth: {
        token
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Connection event handlers
    socketInstance.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      
      toast({
        title: "Connected",
        description: "Real-time monitoring active",
        className: "border-secure bg-secure/10 text-secure",
      });
    });

    socketInstance.on("disconnect", (reason: string) => {
      console.log("WebSocket disconnected:", reason);
      setIsConnected(false);
      
      if (reason === "io server disconnect") {
        // Server disconnected, reconnect manually
        socketInstance.connect();
      }
      
      toast({
        title: "Connection Lost",
        description: "Attempting to reconnect...",
        className: "border-warning bg-warning/10 text-warning",
      });
    });

    socketInstance.on("connect_error", (error: Error) => {
      console.error("WebSocket connection error:", error);
      setError(error.message);
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        toast({
          title: "Connection Failed",
          description: "Unable to establish real-time connection",
          variant: "destructive",
        });
      }
    });

    // Authentication error handler
    socketInstance.on("error", (error: string) => {
      console.error("WebSocket error:", error);
      setError(error);
      
      if (error === "Authentication failed") {
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive",
        });
      }
    });

    // System alert handlers
    socketInstance.on("system:alert", (alert: any) => {
      const severity = alert.severity || "info";
      const toastClass = severity === "high" ? "border-alert bg-alert/10 text-alert" :
                        severity === "medium" ? "border-warning bg-warning/10 text-warning" :
                        "border-primary bg-primary/10 text-primary";
      
      toast({
        title: `System Alert: ${alert.type}`,
        description: alert.details?.message || "System alert detected",
        className: toastClass,
      });
    });

    // Security event handlers
    socketInstance.on("security:event", (event: any) => {
      if (event.severity === "high") {
        toast({
          title: "Security Event",
          description: `${event.eventType.replace(/_/g, ' ')}`,
          className: "border-alert bg-alert/10 text-alert",
        });
      }
    });

    // Fraud alert handlers
    socketInstance.on("fraud:alert", (alert: any) => {
      toast({
        title: "🚨 Fraud Alert",
        description: `Risk Score: ${alert.riskScore} - ${alert.alertType}`,
        className: "border-alert bg-alert/10 text-alert",
      });
    });

    // Biometric result handlers
    socketInstance.on("biometric:result", (result: any) => {
      if (result.type === "verification") {
        const className = result.success 
          ? "border-secure bg-secure/10 text-secure"
          : "border-alert bg-alert/10 text-alert";
        
        toast({
          title: result.success ? "Biometric Verified" : "Verification Failed",
          description: `${result.biometricType || result.type} - ${result.confidence}% confidence`,
          className,
        });
      }
    });

    // Document processing handlers
    socketInstance.on("document:processed", (document: any) => {
      toast({
        title: "Document Processed",
        description: "Document processing completed successfully",
        className: "border-secure bg-secure/10 text-secure",
      });
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [toast]);

  return {
    socket,
    isConnected,
    error
  };
}
