"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  beginGoogleSignIn,
  requestPasswordReset,
  resolveCurrentSession,
  signInWithPassword,
  signOutSession,
  signUpWithPassword,
} from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const refreshSession = async () => {
    setIsLoading(true);

    try {
      const nextSession = await resolveCurrentSession();
      setSession(nextSession);
      return nextSession;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const signIn = async (redirectPath = "/admin") => {
    setIsSigningIn(true);

    try {
      const result = await beginGoogleSignIn(redirectPath);
      return result;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signInWithEmail = async ({ email, password, redirectPath = "/app" }) => {
    setIsSigningIn(true);

    try {
      const result = await signInWithPassword({ email, password, redirectPath });
      const nextSession = await resolveCurrentSession();
      setSession(nextSession);
      return result;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signUpWithEmail = async ({ name, email, password, redirectPath = "/app" }) => {
    setIsSigningIn(true);

    try {
      const result = await signUpWithPassword({ name, email, password, redirectPath });

      if (!result?.pendingVerification) {
        const nextSession = await resolveCurrentSession();
        setSession(nextSession);
      }

      return result;
    } finally {
      setIsSigningIn(false);
    }
  };

  const resetPassword = async ({ email }) => {
    setIsSigningIn(true);

    try {
      return await requestPasswordReset({ email });
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    await signOutSession();
    setSession(null);
  };

  const value = useMemo(() => {
    const role = session?.user?.role || "";

    return {
      session,
      isLoading,
      isSigningIn,
      isAuthenticated: Boolean(session?.token),
      role,
      isAdmin: role === "admin" || role === "superuser",
      isSuperuser: role === "superuser",
      signIn,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOut,
      refreshSession,
    };
  }, [isLoading, isSigningIn, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};

export default AuthProvider;
