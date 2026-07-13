import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { clearAuthToken, hydrateAuthToken, setAuthToken } from "@/lib/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestRef.current;
    await hydrateAuthToken();

    try {
      const { data } = await api.get("/auth/me");
      if (requestId === refreshRequestRef.current) {
        setUser(data.user);
      }
      return data.user;
    } catch {
      if (requestId === refreshRequestRef.current) {
        setUser(null);
      }
      return null;
    } finally {
      if (requestId === refreshRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    refreshRequestRef.current += 1;

    await setAuthToken(data.token);

    setUser(data.user);
    setLoading(false);

    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore logout transport errors so the UI can still clear local state
    }

    await clearAuthToken();
    refreshRequestRef.current += 1;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
