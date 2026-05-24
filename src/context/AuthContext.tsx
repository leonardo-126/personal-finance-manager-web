import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ApiError, setUnauthorizedHandler } from "@/lib/api";
import { authService } from "@/services/api";
import type {
  AuthContextValue,
  LoginCredentials,
  SignupCredentials,
  User,
} from "@/types/auth";

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    authService
      .me()
      .then(me => {
        if (!cancelled) setUser(me);
      })
      .catch(err => {
        if (!(err instanceof ApiError && err.status === 401)) {
          console.error("Failed to load session", err);
        }
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const loggedUser = await authService.login(credentials);
    setUser(loggedUser);
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials) => {
    const newUser = await authService.signup(credentials);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
