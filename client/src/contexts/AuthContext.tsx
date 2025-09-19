import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if we're in development/preview mode
const isDevelopment = import.meta.env.MODE === 'development' || 
                      import.meta.env.DEV || 
                      window.location.hostname === 'localhost';

// Mock admin user for development/preview mode
const MOCK_ADMIN_USER: User = {
  id: "preview-admin-001",
  username: "admin",
  email: "admin@dha.gov.za",
  role: "admin"
};

const MOCK_TOKEN = "preview-mode-token-12345";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("user");
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      return storedToken;
    }
    // Clean up invalid token if user doesn't exist but token does
    if (!localStorage.getItem("user") && storedToken) {
      localStorage.removeItem("authToken");
    }
    return null;
  });

  const [, setLocation] = useLocation();

  // Auto-authenticate in development mode by calling the real login endpoint
  useEffect(() => {
    if (isDevelopment && !user && !token) {
      console.log("🚀 Development Mode - Auto-authenticating via mock-login endpoint");
      
      // Call the real mock-login endpoint to get a proper JWT token
      fetch("/api/auth/mock-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "admin",
          password: "admin123"
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.token && data.user) {
          console.log("✅ Auto-authentication successful");
          console.log("👤 User:", data.user);
          console.log("🔑 JWT Token received");
          
          // Store the real JWT token and user data
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          setToken(data.token);
          setUser(data.user);
        } else {
          console.error("❌ Auto-authentication failed:", data);
        }
      })
      .catch(error => {
        console.error("❌ Auto-authentication error:", error);
      });
    } else if (isDevelopment && user) {
      console.log("🚀 Development Mode - User already authenticated");
      console.log("👤 User:", user);
      console.log("✅ All features unlocked for testing");
    }
  }, [isDevelopment, user, token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("authToken", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  const checkAuth = () => {
    return !!token && !!user;
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}