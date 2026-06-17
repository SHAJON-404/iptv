"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type Session = {
  user: User;
  expires: string;
};

type AuthContextType = {
  session: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  status: "loading",
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            setSession(data.session);
            setStatus("authenticated");
          } else {
            setStatus("unauthenticated");
          }
        } else {
          setStatus("unauthenticated");
        }
      } catch {
        setStatus("unauthenticated");
      }
    };

    fetchSession();
  }, []);

  const logout = async () => {
    setStatus("loading");
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setStatus("unauthenticated");
  };

  return (
    <AuthContext.Provider value={{ session, status, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
