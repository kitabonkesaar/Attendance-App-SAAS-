
import React, { useState, useEffect } from 'react';
import { UserSession, Attendance, AttendanceStatus, Employee, Announcement } from '../../types';
import { DB } from '../../lib/db';
import CameraCapture from './CameraCapture';

interface EmployeeDashboardProps {
  session: UserSession;
  onLogout: () => void;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'HISTORY' | 'PROFILE'>('HOME');
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [showCamera, setShowCamera] = useState<{show: boolean, mode: 'IN' | 'OUT'}>({show: false, mode: 'IN'});
  const [history, setHistory] = useState<Attendance[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timer, setTimer] = useState<string>("00:00:00");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [allAttendance, employees, news] = await Promise.all([
        DB.getAttendance(),
        DB.getEmployees(),
        DB.getAnnouncements()
      ]);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const today = allAttendance.find(a => a.employee_id === session.employee_id && a.date === todayStr);
      const userHistory = allAttendance.filter(a => a.employee_id === session.employee_id).sort((a, b) => b.date.localeCompare(a.date));
      const empData = employees.find(e => e.id === session.employee_id);

      setTodayAttendance(today || null);
      setHistory(userHistory);
      setEmployee(empData || null);
      setAnnouncements(news);
    };

    fetchData();
  }, [session.employee_id, showCamera.show]);

  useEffect(() => {
    let interval: any;
    if (todayAttendance && !todayAttendance.punch_out_time) {
      interval = setInterval(() => {
        const start = new Date(`${todayAttendance.date}T${todayAttendance.time}`);
        const diff = new Date().getTime() - start.getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimer(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [todayAttendance]);

  const handleAttendanceSuccess = (attendance: Attendance) => {
    setShowCamera({show: false, mode: 'IN'});
    setTodayAttendance(attendance);
  };

  const getStatusInfo = () => {
    if (!todayAttendance) return { label: 'Pending', color: 'bg-white border-emerald-100', icon: (
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )};
    if (!todayAttendance.punch_out_time) return { label: 'Punched In', color: 'bg-emerald-600 text-white border-emerald-500', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
    )};
    return { label: 'Punched Out', color: 'bg-gray-900 text-white border-gray-800', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
    )};
  };

  const status = getStatusInfo();

  const renderHome = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <header className="px-6 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
            Hello, <span className="text-emerald-600">{session.name.split(' ')[0]}</span>
          </h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Shift: {employee?.shift_start} - {employee?.shift_end}</p>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-90 transition-all"
        >
          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <section className="px-6">
        <div className={`p-8 rounded-[3rem] border-2 shadow-2xl transition-all relative overflow-hidden ${status.color}`}>
          <div className="flex justify-between items-center mb-8 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest bg-black/10 px-3 py-1.5 rounded-xl flex items-center gap-2">
              {status.icon}
              {status.label}
            </span>
            {todayAttendance?.photo_url && (
              <img src={todayAttendance.photo_url} className="w-12 h-12 rounded-2xl object-cover border-4 border-white/20 shadow-lg" />
            )}
          </div>

          <div className="mb-10 relative z-10">
            <p className="text-[10px] font-black uppercase opacity-60 mb-1">Time Elapsed Today</p>
            <h3 className="text-5xl font-black tracking-tighter">
              {!todayAttendance ? '00:00:00' : !todayAttendance.punch_out_time ? timer : 'Shift End'}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
            <div className="bg-black/5 p-4 rounded-[1.5rem] border border-white/10">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1">Punched In</p>
              <p className="text-sm font-black">{todayAttendance?.time ? todayAttendance.time.slice(0, 5) : '--:--'}</p>
            </div>
            <div className="bg-black/5 p-4 rounded-[1.5rem] border border-white/10">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1">Punched Out</p>
              <p className="text-sm font-black">{todayAttendance?.punch_out_time ? todayAttendance.punch_out_time.slice(0, 5) : '--:--'}</p>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            {!todayAttendance && (
              <button
                onClick={() => setShowCamera({show: true, mode: 'IN'})}
                className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black text-xl shadow-lg active:scale-[0.98] transition-all border border-emerald-400"
              >
                Punch In
              </button>
            )}
            {todayAttendance && !todayAttendance.punch_out_time && (
              <button
                onClick={() => setShowCamera({show: true, mode: 'OUT'})}
                className="w-full bg-white text-emerald-700 py-5 rounded-3xl font-black text-xl shadow-lg active:scale-[0.98] transition-all"
              >
                Punch Out
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Logs</p>
           <p className="text-3xl font-black text-gray-900">{history.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efficiency</p>
           <p className="text-3xl font-black text-emerald-600">
             {history.length > 0 ? Math.round((history.filter(h => h.status === 'PRESENT').length / history.length) * 100) : 100}%
           </p>
        </div>
      </section>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="relative w-72 bg-white h-full shadow-2xl animate-in slide-in-from-left duration-500 flex flex-col">
            <div className="p-8 border-b border-gray-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center text-2xl font-black mb-4 shadow-sm">
                {session.name[0]}
              </div>
              <h3 className="text-xl font-black text-gray-900">{session.name}</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{employee?.department || 'Staff Member'}</p>
            </div>
            <nav className="flex-1 p-6 space-y-2">
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-gray-700 font-black text-xs uppercase tracking-widest">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Settings
              </button>
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-gray-700 font-black text-xs uppercase tracking-widest">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Support
              </button>
            </nav>
            <div className="p-6 border-t border-gray-100">
              <button 
                onClick={() => { onLogout(); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-4 p-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pt-12">
        {activeTab === 'HOME' && renderHome()}
        {activeTab === 'HISTORY' && <div className="p-6 font-black text-gray-900 uppercase tracking-widest">Shift Logs • Detailed History Coming Soon</div>}
        {activeTab === 'PROFILE' && <div className="p-6 font-black text-gray-900 uppercase tracking-widest">Account • Profile Management Coming Soon</div>}
      </main>

      <div className="fixed bottom-8 left-6 right-6 z-40">
        <nav className="bg-white/80 backdrop-blur-3xl border border-white/50 rounded-[3rem] p-3 flex items-center justify-around shadow-2xl">
          {[
            { id: 'HOME', icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            )},
            { id: 'HISTORY', icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            )},
            { id: 'PROFILE', icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center py-2 transition-all duration-300 ${activeTab === tab.id ? 'text-emerald-600 scale-110' : 'text-gray-400 opacity-60'}`}
            >
              {tab.icon}
              <span className={`text-[8px] font-black uppercase mt-1 tracking-widest transition-opacity ${activeTab === tab.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                {tab.id}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {showCamera.show && (
        <div className="fixed inset-0 z-50 bg-black">
          <CameraCapture 
            employeeId={session.employee_id!} 
            mode={showCamera.mode}
            onCancel={() => setShowCamera({show: false, mode: 'IN'})}
            onSuccess={handleAttendanceSuccess}
          />
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
