
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

    // Safety timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out. Please check your internet connection or Supabase URL.")), 10000)
    );

    try {
      // 1. Authenticate with Supabase Auth
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const result: any = await Promise.race([loginPromise, timeoutPromise]);
      const { data, error: authError } = result;

      if (authError) {
        throw new Error(authError.message === 'Invalid login credentials' 
          ? "Login failed: Check your email and password in Supabase > Auth > Users." 
          : authError.message);
      }

      if (data.user) {
        // 2. Fetch or Sync User Profile
        const sessionPromise = DB.getCurrentSession();
        const sessionResult: any = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (sessionResult) {
          onLogin(sessionResult);
        } else {
          setError("Auth successful but session failed to load. Ensure you've run the SQL schema in lib/db.ts.");
        }
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "An unexpected login error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await DB.seedDemoData();
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
            {isEmployee ? 'Employee Portal' : 'Admin Terminal'}
          </p>
        </div>

        <div className="bg-gray-100 p-1.5 rounded-[2rem] flex mb-10 shadow-inner relative">
          <div 
            className={`absolute h-[calc(100%-12px)] top-1.5 transition-all duration-300 ease-out rounded-[1.7rem] shadow-sm ${
              isEmployee ? 'left-1.5 w-[calc(50%-6px)] bg-emerald-600' : 'left-[calc(50%+1.5px)] w-[calc(50%-6px)] bg-indigo-600'
            }`}
          />
          <button
            onClick={() => { setActiveTab(UserRole.EMPLOYEE); setEmail('staff@demo.com'); setPassword('Staff@123'); setError(null); }}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest relative z-10 transition-colors duration-300 ${isEmployee ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Staff
          </button>
          <button
            onClick={() => { setActiveTab(UserRole.ADMIN); setEmail('admin@demo.com'); setPassword('Admin@123'); setError(null); }}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest relative z-10 transition-colors duration-300 ${!isEmployee ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Admin
          </button>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black rounded-[1.5rem] flex items-center gap-4">
             <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <p className="leading-tight">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Email Address</label>
            <input
              type="email"
              required
              autoComplete="email"
              className={`w-full px-6 py-5 rounded-[1.8rem] border border-gray-100 bg-gray-50/50 font-bold focus:ring-4 outline-none transition-all ${isEmployee ? 'focus:ring-emerald-500/10' : 'focus:ring-indigo-500/10'}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className={`w-full px-6 py-5 rounded-[1.8rem] border border-gray-100 bg-gray-50/50 font-bold focus:ring-4 outline-none transition-all ${isEmployee ? 'focus:ring-emerald-500/10' : 'focus:ring-indigo-500/10'}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white font-black py-5 rounded-[1.8rem] shadow-2xl transition-all active:scale-[0.97] disabled:opacity-50 text-[11px] uppercase tracking-[0.25em] ${
              isEmployee ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? 'Verifying...' : 'Sign In Now'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={handleSeed}
            disabled={isSeeding}
            className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest py-2 px-4 bg-emerald-50 rounded-full transition-all border border-emerald-100/50"
          >
            {isSeeding ? 'Connecting...' : '🔧 Fix Login Issues (Setup Guide)'}
          </button>
        </div>
      </div>

      {showSeedGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Database Troubleshoot</h3>
            <div className="space-y-4 text-xs font-bold text-gray-600 leading-relaxed">
              <p>If you've created users in Supabase Auth but can't log in:</p>
              <ol className="list-decimal pl-5 space-y-3">
                <li>Copy the SQL in <code className="bg-gray-100 px-1">lib/db.ts</code>.</li>
                <li>Go to your **Supabase Dashboard &gt; SQL Editor**.</li>
                <li>Paste and **Run** the script. This creates the profiles and RLS policies.</li>
                <li>Run the **BACKFILL SCRIPT** (at the bottom of the code) to sync existing users.</li>
              </ol>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700">
                Ensure **Row Level Security (RLS)** is not blocking your reads. For debugging, you can disable RLS on the `profiles` table.
              </div>
            </div>
            <button 
              onClick={() => setShowSeedGuide(false)}
              className="w-full mt-8 bg-gray-900 text-white font-black py-5 rounded-[1.8rem] shadow-xl uppercase text-xs tracking-widest"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
