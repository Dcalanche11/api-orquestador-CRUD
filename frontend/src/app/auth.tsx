/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, session } from "../services/api";
import type { User } from "../types/models";

type AuthContextValue = {
  user: User | undefined;
  token: string;
  loading: boolean;
  error: Error | null;
  expired: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  retry: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(session.get);
  const [expired, setExpired] = useState(false);
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["me", token],
    queryFn: ({ signal }) => api.me(signal),
    enabled: !!token,
    retry: false,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onExpire = () => {
      session.set("");
      setToken("");
      setExpired(true);
      client.clear();
    };
    window.addEventListener("session-expired", onExpire);
    return () => window.removeEventListener("session-expired", onExpire);
  }, [client]);

  const logout = () => {
    session.set("");
    setToken("");
    setExpired(false);
    client.clear();
  };
  const login = async (username: string, password: string) => {
    const result = await api.login(username, password);
    session.set(result.access_token);
    try {
      const user = await api.me();
      client.clear();
      client.setQueryData(["me", result.access_token], user);
      setExpired(false);
      setToken(result.access_token);
    } catch (error) {
      session.set("");
      throw error;
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user: profile.data,
        token,
        loading: !!token && profile.isPending,
        error: profile.error,
        expired,
        login,
        logout,
        retry: () => {
          void profile.refetch();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider no está disponible.");
  return value;
}
