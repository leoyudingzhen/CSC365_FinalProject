import React, { createContext, useContext, useEffect, useState } from "react";

interface Account {
  email: string;
  username: string;
}

interface AuthContextValue {
  user: Account | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, username: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Account | null>(null);

  // simple persistence to localStorage for session
  useEffect(() => {
    const raw = localStorage.getItem("__app_user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("__app_user", JSON.stringify(user));
    else localStorage.removeItem("__app_user");
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      const r = await fetch("http://localhost:3001/accounts");
      if (!r.ok) return false;
      const accounts = (await r.json()) as any[];
      const found = accounts.find((a) => a.email === email && a.password === password);
      if (found) {
        setUser({ email: found.email, username: found.username });
        return true;
      }
      return false;
    } catch (err) {
      console.error("SignIn error", err);
      return false;
    }
  };

  const signUp = async (email: string, username: string, password: string) => {
    try {
      const r = await fetch("http://localhost:3001/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      if (!r.ok) return false;
      // set as signed in immediately
      setUser({ email, username });
      return true;
    } catch (err) {
      console.error("SignUp error", err);
      return false;
    }
  };

  const signOut = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
  );
};

export default AuthContext;
