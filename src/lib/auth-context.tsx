"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthUser } from "@/types";
import { invokeCommand } from "@/lib/tauri";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  setupAdmin: (username: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const checkInitialState = async () => {
    setIsLoading(true);
    try {
      // 1. Check if first-time setup is needed
      const requiresSetup = await invokeCommand<boolean>("check_needs_setup");
      setNeedsSetup(requiresSetup);

      if (!requiresSetup) {
        // Check saved session from both storage keys
        const savedToken =
          typeof window !== "undefined"
            ? localStorage.getItem("simarta_session_token") ||
              (localStorage.getItem("simarta_mock_session")
                ? (() => {
                    try {
                      return JSON.parse(localStorage.getItem("simarta_mock_session") || "{}").token;
                    } catch {
                      return null;
                    }
                  })()
                : null)
            : null;

        if (savedToken) {
          try {
            const currentUser = await invokeCommand<AuthUser>("get_current_user", { token: savedToken });
            setUser(currentUser);
            setToken(savedToken);
            if (typeof window !== "undefined") {
              localStorage.setItem("simarta_session_token", savedToken);
              localStorage.setItem(
                "simarta_mock_session",
                JSON.stringify({ token: savedToken, user: currentUser })
              );
            }
          } catch {
            if (typeof window !== "undefined") {
              localStorage.removeItem("simarta_session_token");
              localStorage.removeItem("simarta_mock_session");
            }
            setUser(null);
            setToken(null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to check auth state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkInitialState();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await invokeCommand<{ token: string; user: AuthUser }>("login", {
      username,
      password,
    });
    setUser(res.user);
    setToken(res.token);
    if (typeof window !== "undefined") {
      localStorage.setItem("simarta_session_token", res.token);
      localStorage.setItem(
        "simarta_mock_session",
        JSON.stringify({ token: res.token, user: res.user })
      );
    }
  };

  const setupAdmin = async (username: string, password: string, fullName: string) => {
    const res = await invokeCommand<{ token: string; user: AuthUser }>("setup_initial_admin", {
      username,
      password,
      fullName,
      full_name: fullName,
    });
    setUser(res.user);
    setToken(res.token);
    setNeedsSetup(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("simarta_session_token", res.token);
      localStorage.setItem(
        "simarta_mock_session",
        JSON.stringify({ token: res.token, user: res.user })
      );
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await invokeCommand("logout", { token });
      } catch (e) {
        console.error("Logout error:", e);
      }
    }
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("simarta_session_token");
      localStorage.removeItem("simarta_mock_session");
    }
  };

  const refreshSession = async () => {
    if (!token) return;
    try {
      const currentUser = await invokeCommand<AuthUser>("get_current_user", { token });
      setUser(currentUser);
    } catch {
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        needsSetup,
        login,
        setupAdmin,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("simarta_session_token");
  if (token) return token;
  const mockSession = localStorage.getItem("simarta_mock_session");
  if (mockSession) {
    try {
      const parsed = JSON.parse(mockSession);
      if (parsed?.token) return parsed.token;
    } catch {
      // ignore
    }
  }
  return "mock-token";
}
