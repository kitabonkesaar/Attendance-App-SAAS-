
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../../types';
import { DB } from '../../lib/db';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      // Fix: Await async database call to get configuration
      const data = await DB.getSettings();
      setSettings(data);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    // Fix: Await async saveSettings database operation
    await DB.saveSettings(settings, 'admin1');
    setSaveStatus("Global configuration updated!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 lg:space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Attendance Rules */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
          </div>

          <h4 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Timing Rules
          </h4>
          <div className="space-y-6 relative z-10">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Daily Shift Start</label>
              <input 
                type="time" 
                value={settings.attendance_window_start}
                onChange={(e) => setSettings({...settings, attendance_window_start: e.target.value})}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white font-black transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Late Tolerance (Min)</label>
              <input 
                type="number" 
                value={settings.late_threshold_minutes}
                onChange={(e) => setSettings({...settings, late_threshold_minutes: parseInt(e.target.value)})}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white font-black transition-all"
              />
              <p className="text-[10px] text-amber-600 mt-3 font-bold uppercase tracking-tight">Grace period before 'LATE' status kicks in.</p>
            </div>
          </div>
        </div>

        {/* Security Rules */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          </div>

          <h4 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3 relative z-10">
             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.355r-.343-.133a11.955 11.955 0 01-8.618-3.04A11.955 11.955 0 013 6.012l.343.133a11.955 11.955 0 008.618 3.041c2.422 0 4.673-.721 6.556-1.958L19 6.012a11.955 11.955 0 01-8.618 3.041z" />
               </svg>
             </div>
             Security Layer
          </h4>
          <div className="space-y-4 relative z-10">
            {[
              { label: 'GPS Geofencing', desc: 'Require live coordinates', key: 'location_mandatory' },
              { label: 'Identity Check', desc: 'Mandatory selfie capture', key: 'photo_mandatory' },
              { label: 'Device Lock', desc: 'Restrict to single device', key: 'device_binding' }
            ].map((rule) => (
              <div key={rule.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest block">{rule.label}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{rule.desc}</span>
                </div>
                <button 
                  onClick={() => setSettings({...settings, [rule.key]: !settings[rule.key as keyof AppSettings]})}
                  className={`w-14 h-8 rounded-full transition-all relative ${settings[rule.key as keyof AppSettings] ? 'bg-emerald-600 shadow-lg shadow-emerald-200' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${settings[rule.key as keyof AppSettings] ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-emerald-900 p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-100">
         <div className="max-w-sm">
           <p className="text-white font-black text-lg tracking-tight leading-tight">Sync Changes Globally</p>
           <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Updates reflect instantly for all staff</p>
         </div>
         <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
            {saveStatus && <span className="text-emerald-300 text-[10px] font-black uppercase tracking-widest animate-pulse">{saveStatus}</span>}
            <button 
              onClick={handleSave}
              className="w-full sm:w-auto bg-white text-emerald-900 font-black px-10 py-5 rounded-2xl shadow-xl shadow-black/10 transition-all active:scale-95 text-xs uppercase tracking-[0.2em]"
            >
              Deploy Configuration
            </button>
         </div>
      </div>
    </div>
  );
};

export default AdminSettings;
