import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthResponse } from '@shared/api';

// --- Types ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  updateUser: (user: User) => void; // Helper to update local user state without re-auth
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Computed property for easy access
  const isAuthenticated = !!user && !!token;

  // --- Core Logic ---

  // 1. Initial Load & Verification
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('authToken');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${savedToken}` },
        });

        if (response.ok) {
          const data: AuthResponse = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            setToken(savedToken);
          } else {
            throw new Error("Invalid token payload");
          }
        } else {
          throw new Error("Token validation failed");
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
        logout(); // Clean up invalid session
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // 2. Authentication Actions
  const handleAuthResponse = useCallback((data: AuthResponse) => {
    if (data.success && data.user && data.token) {
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('authToken', data.token);
      // Optional: Set up axios default header here if using axios
    }
    return data;
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      return handleAuthResponse(data);
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Connection to server failed' };
    }
  };

  const signup = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      return handleAuthResponse(data);
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Connection to server failed' };
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    // Optional: Redirect to login page logic here if needed
  }, []);

  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  // --- Context Value ---
  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Hook ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
