
import React, { useState, useEffect } from 'react';
import { UserSession, UserRole } from './types';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import AdminDashboardView from './components/admin/AdminDashboardView';
import LoginView from './components/auth/LoginView';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = localStorage.getItem('pa_session');
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user: UserSession) => {
    localStorage.setItem('pa_session', JSON.stringify(user));
    setSession(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('pa_session');
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
    return <LoginView onLogin={handleLogin} />;
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
