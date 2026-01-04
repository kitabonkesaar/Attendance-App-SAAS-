import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { DB } from '../../lib/db';
import { Employee } from '../../types';

interface StaffRegistrationProps {
  onBack: () => void;
  onSuccess: () => void;
}

const StaffRegistration: React.FC<StaffRegistrationProps> = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Validate Password
      if (formData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      // 2. Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { name: formData.name }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Registration failed. Please try again.");

      const userId = authData.user.id;

      // 3. Create Profile (Bypassing RLS via Admin Client)
      await DB.manualCreateProfile(userId, formData.email, formData.name);

      // 4. Create Employee Record
      // We need to generate a unique employee code.
      // Ideally this happens on the server, but we'll do a best-effort count here.
      // Fetching all employees is expensive, so we'll use a timestamp-based code or similar.
      // Or just 'EMP' + random 4 digits for now.
      const empCode = `EMP${Math.floor(1000 + Math.random() * 9000)}`;

      const newEmployee: Employee = {
        id: userId,
        employee_code: empCode,
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        role: 'Staff',
        department: 'General',
        joining_date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        shift_start: '09:00',
        shift_end: '18:00',
        created_at: new Date().toISOString(),
      };

      await DB.updateEmployee(newEmployee, 'self-register');

      setSuccess(true);
      // Optional: Auto-login or ask to verify email
      // Supabase usually requires email verification by default.
      
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-in fade-in">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
           <div className="bg-white py-8 px-4 shadow-xl rounded-[2.5rem] sm:px-10 text-center border border-gray-100">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-sm text-gray-500 mb-8">
                Please check your email <strong>{formData.email}</strong> to verify your account before logging in.
              </p>
              <button
                onClick={onBack}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-black text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all active:scale-95 uppercase tracking-widest"
              >
                Back to Login
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-in slide-in-from-right duration-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-black text-gray-900 tracking-tight">
          Join the Team
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 font-medium">
          Create your staff account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-[2.5rem] sm:px-10 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in shake">
                 <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-bold bg-gray-50"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-bold bg-gray-50"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-bold bg-gray-50"
                placeholder="1234567890"
                value={formData.mobile}
                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-bold bg-gray-50"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <p className="mt-1 text-[10px] text-gray-400 font-medium">Min. 8 characters</p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 uppercase tracking-widest"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>

            <div className="text-center mt-4">
               <button type="button" onClick={onBack} className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                  Already have an account? Sign In
               </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffRegistration;
