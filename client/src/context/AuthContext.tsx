import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setAuthenticated(Boolean(res.data.authenticated)))
      .finally(() => setLoading(false));
  }, []);

  async function login(password: string) {
    await api.post("/auth/login", { password });
    setAuthenticated(true);
  }

  async function logout() {
    await api.post("/auth/logout");
    setAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
