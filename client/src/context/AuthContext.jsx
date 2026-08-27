import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

// Tiempo de inactividad para vencimiento automático de sesión: 15 minutos
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('asuncion_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem('asuncion_auth_user');
    return saved ? JSON.parse(saved).role : 'citizen';
  });

  const inactivityTimerRef = useRef(null);

  const extractUserData = (authSession) => {
    if (!authSession?.user) return null;
    const authUser = authSession.user;
    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email.split('@')[0],
      role: authUser.app_metadata?.role || authUser.user_metadata?.role || 'admin',
      department: authUser.user_metadata?.department || 'Dirección General de Servicios Urbanos',
      phone: authUser.user_metadata?.phone || ''
    };
  };

  const logout = useCallback(async (isAutoExpired = false) => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    setUser(null);
    setSession(null);
    setRole('citizen');
    localStorage.removeItem('asuncion_auth_user');

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (isAutoExpired) {
      setSessionExpiredNotice(true);
    }
  }, []);

  // Reiniciar temporizador de inactividad
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.warn('⏱️ Sesión expirada por inactividad del usuario (15 min). Cerrando sesión...');
        logout(true);
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [user, logout]);

  // Detector de eventos de actividad del usuario
  useEffect(() => {
    if (!user) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Throttled handler
    let lastActivity = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 1000) { // Actualizar cada 1 seg máximo
        lastActivity = now;
        resetInactivityTimer();
      }
    };

    resetInactivityTimer();

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    // 1. Obtener sesión activa de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const u = extractUserData(session);
        setUser(u);
        setRole(u.role);
        localStorage.setItem('asuncion_auth_user', JSON.stringify(u));
      } else {
        const saved = localStorage.getItem('asuncion_auth_user');
        if (saved) {
          try {
            const u = JSON.parse(saved);
            setUser(u);
            setRole(u.role);
          } catch (e) {
            setUser(null);
          }
        }
      }
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación en Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        const u = extractUserData(session);
        setUser(u);
        setRole(u.role);
        setSessionExpiredNotice(false);
        localStorage.setItem('asuncion_auth_user', JSON.stringify(u));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole('citizen');
        localStorage.removeItem('asuncion_auth_user');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithPassword = async (email, password) => {
    setLoading(true);
    setSessionExpiredNotice(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        throw new Error(
          error.message === 'Invalid login credentials'
            ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
            : error.message
        );
      }

      if (data?.session && data?.user) {
        const userData = extractUserData(data.session);
        setSession(data.session);
        setUser(userData);
        setRole(userData.role);
        localStorage.setItem('asuncion_auth_user', JSON.stringify(userData));
        resetInactivityTimer();
        return userData;
      }

      throw new Error('No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const dismissExpiredNotice = () => setSessionExpiredNotice(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isAuthenticated: !!user,
        isAdmin: role === 'admin' || role === 'supervisor',
        loading,
        sessionExpiredNotice,
        dismissExpiredNotice,
        loginWithPassword,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
