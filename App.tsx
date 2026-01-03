
import React, { useState, useEffect } from 'react';
import { UserSession, UserRole } from './types';
import { DB } from './lib/db';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import AdminDashboardView from './components/admin/AdminDashboardView';
import LoginView from './components/auth/LoginView';
import { supabase } from './lib/supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const activeSession = await DB.getCurrentSession();
        if (isMounted) {
          setSession(activeSession);
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // Safety timeout to prevent infinite loading (max 3 seconds)
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsLoading((prev) => {
          if (prev) console.warn("Session check timed out. Forcing UI load.");
          return false;
        });
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, _session) => {
      if (!isMounted) return;
      // We rely on checkSession for initial load. 
      // This listener handles subsequent updates (login/logout/token refresh).
      // To avoid race conditions on mount, we only process if not already loading or if checkSession finished.
      // But simplest is to just fetch.
      const activeSession = await DB.getCurrentSession();
      if (isMounted) {
        setSession(activeSession);
        // Ensure loading is cleared if auth state changes (e.g. fast login)
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!session) {
    return <LoginView onLogin={(user) => setSession(user)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {session.role === UserRole.ADMIN || session.role === UserRole.SUPER_ADMIN ? (
        <AdminDashboardView session={session} onLogout={handleLogout} />
      ) : (
        <EmployeeDashboard session={session} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
