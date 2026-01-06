
import React, { useState, useEffect } from 'react';
import { UserSession, UserRole } from './types';
import { DB } from './lib/db';
const EmployeeDashboard = React.lazy(() => import('./employee/EmployeeDashboard'));
const AdminDashboardView = React.lazy(() => import('./admin/AdminDashboardView'));
const LoginView = React.lazy(() => import('./components/auth/LoginView'));
const StaffRegistration = React.lazy(() => import('./components/auth/StaffRegistration'));
const ForgotPassword = React.lazy(() => import('./components/auth/ForgotPassword'));
import SessionTimeout from './components/auth/SessionTimeout';
import { supabase } from './lib/supabaseClient';

// Reusable Loading Spinner for Suspense Fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        console.log("Checking session...");
        const activeSession = await DB.getCurrentSession();
        console.log("Session Check Result:", activeSession);
        
        if (isMounted) {
          if (activeSession) {
             setSession(activeSession);
          } else {
             // Session invalid/expired -> Clear
             console.log("No active session found.");
             setSession(null);
          }
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

    // Safety timeout to prevent infinite loading (Increased to 10 seconds for mobile networks)
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsLoading((prev) => {
          if (prev) {
             console.warn("Session check timed out. Forcing UI load.");
             setSession(null); // Assume logged out if it takes too long
          }
          return false;
        });
      }
    }, 10000);

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
    setIsLoading(true); // Show loading spinner immediately
    try {
      // Attempt global sign out with timeout race to prevent indefinite hanging
      // We ignore errors because we are clearing the local session anyway
      // Use scope: 'local' to avoid network aborts on navigation
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timed out')), 2000))
      ]);
    } catch (err) {
      // Ignore network aborts or other sign-out errors
      console.warn("Sign out cleanup completed with warning:", err);
    } finally {
      setSession(null);
      setAuthView('login'); // Ensure we go back to login view
      setIsLoading(false);
    }
  };

  const handleSessionTimeout = () => {
    alert("Your session has expired due to inactivity."); 
    handleLogout();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!session) {
    if (authView === 'register') {
      return (
        <React.Suspense fallback={<LoadingSpinner />}>
          <StaffRegistration onBack={() => setAuthView('login')} onSuccess={() => setAuthView('login')} />
        </React.Suspense>
      );
    }
    if (authView === 'forgot-password') {
      return (
        <React.Suspense fallback={<LoadingSpinner />}>
          <ForgotPassword onBack={() => setAuthView('login')} />
        </React.Suspense>
      );
    }
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <LoginView 
          onLogin={(user) => setSession(user)} 
          onRegisterClick={() => setAuthView('register')}
          onForgotPasswordClick={() => setAuthView('forgot-password')}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SessionTimeout 
        isActive={!!session} 
        onTimeout={handleSessionTimeout} 
        timeoutInMs={15 * 60 * 1000} // 15 Minutes
      />
      <React.Suspense fallback={<LoadingSpinner />}>
        {session.role === UserRole.ADMIN || session.role === UserRole.SUPER_ADMIN ? (
          <AdminDashboardView session={session} onLogout={handleLogout} />
        ) : (
          <EmployeeDashboard session={session} onLogout={handleLogout} />
        )}
      </React.Suspense>
    </div>
  );
};

export default App;
