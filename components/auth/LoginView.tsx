
import React, { useState } from 'react';
import { UserRole, UserSession } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { DB } from '../../lib/db';

interface LoginViewProps {
  onLogin: (user: UserSession) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.EMPLOYEE);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showSeedGuide, setShowSeedGuide] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        const session = await DB.getCurrentSession();
        if (session) {
          onLogin(session);
        } else {
          setError("Profile initialization failed. Please contact support.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const msg = await DB.seedDemoData();
      setShowSeedGuide(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const isEmployee = activeTab === UserRole.EMPLOYEE;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6 font-sans">
      <div className="bg-white p-10 rounded-[3rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] w-full max-w-md border border-gray-100 relative overflow-hidden transition-all duration-500">
        <div className={`absolute top-0 left-0 right-0 h-2 transition-colors duration-500 ${isEmployee ? 'bg-emerald-600' : 'bg-indigo-600'}`}></div>
        
        <div className="text-center mb-8">
          <div className={`inline-block p-4 rounded-3xl mb-6 transition-colors duration-500 ${isEmployee ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {isEmployee ? (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )}
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Photo<span className={`${isEmployee ? 'text-emerald-600' : 'text-indigo-600'} transition-colors duration-500`}>Hub</span></h1>
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mt-3">
            {isEmployee ? 'Employee Punch-In' : 'Administrative Center'}
          </p>
        </div>

        <div className="bg-gray-100 p-1.5 rounded-[2rem] flex mb-10 shadow-inner relative">
          <div 
            className={`absolute h-[calc(100%-12px)] top-1.5 transition-all duration-300 ease-out rounded-[1.7rem] shadow-sm ${
              isEmployee ? 'left-1.5 w-[calc(50%-6px)] bg-emerald-600' : 'left-[calc(50%+1.5px)] w-[calc(50%-6px)] bg-indigo-600'
            }`}
          />
          <button
            onClick={() => setActiveTab(UserRole.EMPLOYEE)}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest relative z-10 transition-colors duration-300 ${isEmployee ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Staff
          </button>
          <button
            onClick={() => setActiveTab(UserRole.ADMIN)}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest relative z-10 transition-colors duration-300 ${!isEmployee ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Admin
          </button>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black rounded-[1.5rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
             <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Email Address</label>
            <div className="relative group">
              <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isEmployee ? 'text-emerald-300 group-focus-within:text-emerald-600' : 'text-indigo-300 group-focus-within:text-indigo-600'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <input
                type="email"
                required
                placeholder={isEmployee ? 'staff@demo.com' : 'admin@demo.com'}
                className={`w-full pl-14 pr-6 py-5 rounded-[1.8rem] border border-gray-100 bg-gray-50/50 font-bold focus:ring-4 outline-none transition-all ${isEmployee ? 'focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-100' : 'focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-100'}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Password</label>
            <div className="relative group">
              <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isEmployee ? 'text-emerald-300 group-focus-within:text-emerald-600' : 'text-indigo-300 group-focus-within:text-indigo-600'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                className={`w-full pl-14 pr-6 py-5 rounded-[1.8rem] border border-gray-100 bg-gray-50/50 font-bold focus:ring-4 outline-none transition-all ${isEmployee ? 'focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-100' : 'focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-100'}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white font-black py-5 rounded-[1.8rem] shadow-2xl transition-all active:scale-[0.97] disabled:opacity-50 text-[11px] uppercase tracking-[0.25em] flex items-center justify-center gap-4 ${
              isEmployee ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {isEmployee ? 'Punch In Portal' : 'Admin Hub Access'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center flex flex-col items-center gap-4">
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center justify-center gap-3 w-full">
            <span className="flex-1 h-px bg-gray-100"></span>
            Demo Control Center
            <span className="flex-1 h-px bg-gray-100"></span>
          </p>
          
          <button 
            onClick={handleSeed}
            disabled={isSeeding}
            className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest py-2 px-4 bg-emerald-50 rounded-full transition-all border border-emerald-100/50 active:scale-95 disabled:opacity-50"
          >
            {isSeeding ? 'Initializing Tables...' : '⚙️ Setup Demo Environment'}
          </button>
        </div>
      </div>

      {/* Seeding Guide Modal */}
      {showSeedGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 lg:p-10 shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Environment Ready</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Next steps for real Supabase testing</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Authentication Setup</p>
                <p className="text-sm font-bold text-gray-700 leading-relaxed">
                  Go to your <span className="text-emerald-600">Supabase Dashboard > Auth > Users</span> and manually create these accounts:
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="flex justify-between items-center text-xs font-black p-3 bg-white rounded-xl border border-gray-100">
                    <span>Admin: admin@demo.com</span>
                    <span className="text-gray-400 text-[10px]">Pass: Admin@123</span>
                  </li>
                  <li className="flex justify-between items-center text-xs font-black p-3 bg-white rounded-xl border border-gray-100">
                    <span>Staff: staff@demo.com</span>
                    <span className="text-gray-400 text-[10px]">Pass: Staff@123</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">2. Schema Requirement</p>
                <p className="text-xs font-bold text-amber-800 leading-relaxed italic">
                  Ensure you've run the SQL script found in `lib/db.ts` comments in your Supabase SQL Editor.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowSeedGuide(false)}
              className="w-full mt-8 bg-gray-900 text-white font-black py-5 rounded-[1.8rem] shadow-xl hover:bg-black transition-all text-xs uppercase tracking-widest"
            >
              I've Created the Users
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
