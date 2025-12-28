import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { login as apiLogin, signup as apiSignup, sendOtp as apiSendOtp } from '@/services/api';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  contactNumber: string;
  gender: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  justLoggedIn: boolean;
  login: (credentials: { identifier: string; password: string }) => Promise<boolean>;
  signup: (userData: {
    firstName: string;
    lastName: string;
    gender: string;
    email: string;
    password: string;
    otp: string;
    username: string;
  }) => Promise<boolean>;
  sendOtp: (email: string) => Promise<boolean>;
  logout: () => void;
  resetJustLoggedIn: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for stored auth on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedAuth = localStorage.getItem('isAuthenticated');

    if (storedUser && storedAuth === 'true') {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const login = async (credentials: { identifier: string; password: string }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiLogin(credentials);
      if (response.success) {
        const userData: User = response.user;

        setUser(userData);
        setIsAuthenticated(true);
        setJustLoggedIn(true);

        // Store in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');

        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: {
    firstName: string;
    lastName: string;
    gender: string;
    email: string;
    password: string;
    otp: string;
    username: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiSignup(userData);
      if (response.success) {
        const newUser: User = {
          id: Date.now(), // Temporary ID
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          contactNumber: '', // Would come from backend
          gender: userData.gender,
        };

        setUser(newUser);
        setIsAuthenticated(true);
        setJustLoggedIn(true);

        // Store in localStorage
        localStorage.setItem('user', JSON.stringify(newUser));
        localStorage.setItem('isAuthenticated', 'true');

        return true;
      }
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string): Promise<boolean> => {
    try {
      const response = await apiSendOtp({ email });
      return response.success;
    } catch (error) {
      console.error('Send OTP error:', error);
      return false;
    }
  };

  const resetJustLoggedIn = () => {
    setJustLoggedIn(false);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setJustLoggedIn(false);

    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');

    // Redirect to auth page will be handled by the component using this
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    justLoggedIn,
    login,
    signup,
    sendOtp,
    logout,
    resetJustLoggedIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
