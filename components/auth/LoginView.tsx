
import React, { useState } from 'react';
import { UserRole, UserSession } from '../../types';
import { DB } from '../../lib/db';

interface LoginViewProps {
  onLogin: (user: UserSession) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Simulated short delay for realism
    setTimeout(() => {
      const user = DB.verifyCredentials(
        identifier, 
        password, 
        mode === 'ADMIN' ? UserRole.ADMIN : UserRole.EMPLOYEE
      );

      if (user) {
        onLogin({
          id: user.id,
          name: user.name,
          role: mode === 'ADMIN' ? UserRole.ADMIN : UserRole.EMPLOYEE,
          employee_id: mode === 'EMPLOYEE' ? user.id : undefined
        });
      } else {
        setError("Invalid credentials. Please check your " + (mode === 'EMPLOYEE' ? "mobile/email" : "email") + " and password.");
        setIsSubmitting(false);
      }
    }, 800);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-gray-100 relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-600"></div>
        
        <div className="text-center mb-10">
          <div className="inline-block p-3 bg-emerald-50 rounded-2xl mb-4">
             <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Photo<span className="text-emerald-600">Attendance</span></h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Workforce Management</p>
        </div>

        <div className="flex mb-8 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
          <button
            onClick={() => { setMode('EMPLOYEE'); setError(null); }}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${mode === 'EMPLOYEE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Employee
          </button>
          <button
            onClick={() => { setMode('ADMIN'); setError(null); }}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${mode === 'ADMIN' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Admin
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-black rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
             <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              {mode === 'EMPLOYEE' ? 'Email / Mobile' : 'Admin Email'}
            </label>
            <input
              type="text"
              required
              placeholder={mode === 'EMPLOYEE' ? 'Enter Mobile or Email' : 'admin@photoattendance.com'}
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all placeholder:text-gray-300"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Security Key
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all placeholder:text-gray-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Enter Workspace
              </>
            )}
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-4">
           <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Secure Biometric Protocol V2.4</p>
           </div>
           <p className="text-[10px] font-bold text-gray-300 text-center max-w-[200px]">
             Default Admin: admin@photoattendance.com / Admin@123
           </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
