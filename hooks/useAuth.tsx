
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { firebaseService } from '../services/firebaseService';
import { AdminUser } from '../types';

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await firebaseService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("No active session", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const loggedInUser = await firebaseService.login(email, pass);
      setUser(loggedInUser);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await firebaseService.logout();
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
