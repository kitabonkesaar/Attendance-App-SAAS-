
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
  const [greeting, setGreeting] = useState<string>("Good Morning");

  useEffect(() => {
    const fetchData = () => {
      const allAttendance = DB.getAttendance();
      const todayStr = new Date().toISOString().split('T')[0];
      const today = allAttendance.find(a => a.employee_id === session.employee_id && a.date === todayStr);
      const userHistory = allAttendance.filter(a => a.employee_id === session.employee_id).sort((a, b) => b.date.localeCompare(a.date));
      const empData = DB.getEmployees().find(e => e.id === session.employee_id);
      const news = DB.getAnnouncements();

      setTodayAttendance(today || null);
      setHistory(userHistory);
      setEmployee(empData || null);
      setAnnouncements(news);
      
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting("Good Morning");
      else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");
    };

    fetchData();
  }, [session.employee_id, showCamera.show]);

  // Live timer for active shift
  useEffect(() => {
    let interval: any;
    if (todayAttendance && !todayAttendance.punch_out_time) {
      interval = setInterval(() => {
        const start = new Date(`${todayAttendance.date}T${todayAttendance.time}`);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimer(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);
    } else if (todayAttendance?.punch_out_time) {
      const start = new Date(`${todayAttendance.date}T${todayAttendance.time}`);
      const end = new Date(`${todayAttendance.date}T${todayAttendance.punch_out_time}`);
      const diff = end.getTime() - start.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimer(`${hours}h ${minutes}m total`);
    }
    return () => clearInterval(interval);
  }, [todayAttendance]);

  const handleAttendanceSuccess = (attendance: Attendance) => {
    setShowCamera({show: false, mode: 'IN'});
    setTodayAttendance(attendance);
  };

  const renderHome = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      {/* Top Welcome Section */}
      <section className="px-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-tight">
            {greeting},<br />
            <span className="text-emerald-600">{session.name.split(' ')[0]}!</span>
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{employee?.role}</p>
        </div>
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-black shadow-inner">
            {session.name[0]}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-gray-50 rounded-full"></div>
        </div>
      </section>

      {/* Announcements Scroller */}
      <section className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Notice Board</h3>
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">New</span>
        </div>
        <div className="flex overflow-x-auto gap-4 no-scrollbar">
          {announcements.map(ann => (
            <div key={ann.id} className="min-w-[280px] bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform">
                 {ann.type === 'HOLIDAY' ? (
                   <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.95 15.05a1 1 0 101.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707z" /></svg>
                 ) : (
                   <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                 )}
              </div>
              <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">{ann.type}</p>
              <h4 className="font-black text-gray-900 text-sm mb-1">{ann.title}</h4>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-medium">{ann.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Attendance Card */}
      <section className="px-6">
        <div className={`p-8 rounded-[3rem] border-2 transition-all duration-700 relative overflow-hidden ${
          !todayAttendance ? 'bg-white border-amber-100 shadow-2xl shadow-amber-100/30' : 
          !todayAttendance.punch_out_time ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-200 border-emerald-500' :
          'bg-gray-900 text-white shadow-2xl shadow-gray-400 border-gray-800'
        }`}>
          {/* Decorative Background Elements */}
          <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-8 -mt-8 rounded-full ${!todayAttendance ? 'bg-amber-400' : 'bg-white'}`}></div>

          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
              !todayAttendance ? 'bg-amber-50 text-amber-700' : 
              !todayAttendance.punch_out_time ? 'bg-white/20 text-white border border-white/20' :
              'bg-emerald-500 text-white'
            }`}>
              <div className={`w-2 h-2 rounded-full ${!todayAttendance ? 'bg-amber-500 animate-pulse' : !todayAttendance.punch_out_time ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`}></div>
              {!todayAttendance ? 'Shift Pending' : !todayAttendance.punch_out_time ? 'Active Shift' : 'Shift Done'}
            </div>
            
            {todayAttendance && (
               <div className="flex -space-x-3">
                  <img src={todayAttendance.photo_url} className="w-12 h-12 rounded-2xl object-cover ring-4 ring-white/10 shadow-lg hover:z-20 transition-all" alt="In" />
                  {todayAttendance.punch_out_photo_url && (
                    <img src={todayAttendance.punch_out_photo_url} className="w-12 h-12 rounded-2xl object-cover ring-4 ring-white/10 shadow-lg hover:z-20 transition-all" alt="Out" />
                  )}
               </div>
            )}
          </div>

          <div className="mb-10 relative z-10">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${!todayAttendance ? 'text-gray-400' : 'text-white/50'}`}>
              Session Timeline
            </p>
            <h3 className={`text-4xl font-black tracking-tighter ${!todayAttendance ? 'text-gray-900' : 'text-white'}`}>
              {!todayAttendance ? 'Punch In' : !todayAttendance.punch_out_time ? timer : 'Shift Finished'}
            </h3>
          </div>

          {/* Timeline Visualizer */}
          <div className={`flex gap-6 mb-10 p-6 rounded-[2rem] relative z-10 ${!todayAttendance ? 'bg-gray-50' : 'bg-white/10 backdrop-blur-xl border border-white/5'}`}>
             <div className="flex-1 text-center">
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${!todayAttendance ? 'text-gray-400' : 'text-white/40'}`}>IN</p>
                <p className={`text-lg font-black ${!todayAttendance ? 'text-gray-300' : 'text-white'}`}>{todayAttendance?.time?.slice(0, 5) || '--:--'}</p>
             </div>
             <div className="w-px bg-gray-200/20 h-10 self-center"></div>
             <div className="flex-1 text-center">
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${!todayAttendance ? 'text-gray-400' : 'text-white/40'}`}>OUT</p>
                <p className={`text-lg font-black ${!todayAttendance ? 'text-gray-300' : 'text-white'}`}>{todayAttendance?.punch_out_time?.slice(0, 5) || '--:--'}</p>
             </div>
          </div>

          <div className="space-y-4 relative z-10">
            {!todayAttendance && (
              <button
                onClick={() => setShowCamera({show: true, mode: 'IN'})}
                className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-4 shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8l2-2m10 0l2 2m-2 10l2-2m-10 0l-2-2" />
                </svg>
                Punch In
              </button>
            )}

            {todayAttendance && !todayAttendance.punch_out_time && (
              <button
                onClick={() => setShowCamera({show: true, mode: 'OUT'})}
                className="w-full bg-white text-emerald-700 py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-4 shadow-xl shadow-white/10 active:scale-[0.98] transition-all"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Punch Out
              </button>
            )}

            {todayAttendance?.punch_out_time && (
              <div className="bg-emerald-500 text-white rounded-3xl p-5 flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 animate-in zoom-in-95">
                 <div className="bg-white/20 p-2 rounded-full">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                 </div>
                 <span className="font-black text-sm uppercase tracking-widest">Attendance Verified</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Summary Stats Grid */}
      <section className="px-6 grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Monthly<br/>Days</p>
           </div>
           <p className="text-3xl font-black text-gray-900">{history.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Perfect<br/>Score</p>
           </div>
           <p className="text-3xl font-black text-emerald-600">
             {history.length > 0 ? Math.round((history.filter(h => h.status === 'PRESENT').length / history.length) * 100) : 100}%
           </p>
        </div>
      </section>
    </div>
  );

  const renderHistory = () => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const startDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const monthName = now.toLocaleString('default', { month: 'long' });

    const getStatusForDay = (day: number) => {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return history.find(h => h.date === dateStr);
    };

    return (
      <div className="px-6 animate-in fade-in slide-in-from-right-8 duration-500 pb-32">
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50 p-8">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-2xl font-black text-gray-900 tracking-tighter">{monthName}</h2>
             <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>)}
             </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{d}</div>)}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const record = getStatusForDay(day);
              const isToday = day === now.getDate();
              
              return (
                <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-2xl relative transition-all duration-300 ${isToday ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-50' : record ? 'bg-gray-50' : ''}`}>
                  <span className={`text-sm font-black ${isToday ? 'text-white' : record ? 'text-gray-900' : 'text-gray-300'}`}>{day}</span>
                  {record && !isToday && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      record.status === AttendanceStatus.PRESENT ? 'bg-emerald-500' : 
                      record.status === AttendanceStatus.LATE ? 'bg-amber-500' : 'bg-red-400'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 space-y-4">
           <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-3">Recent Logs</h3>
           {history.slice(0, 10).map(h => (
             <div key={h.id} className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-3xl flex flex-col items-center justify-center font-black ${h.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <span className="text-lg leading-none">{new Date(h.date).getDate()}</span>
                    <span className="text-[9px] uppercase tracking-tighter">{new Date(h.date).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm leading-tight">Session Completed</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                      {h.time?.slice(0,5)} — {h.punch_out_time?.slice(0,5) || '..:..'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${h.status === 'LATE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {h.status}
                  </span>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="px-6 animate-in fade-in slide-in-from-left-8 duration-500 space-y-6 pb-32">
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50 p-10 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-emerald-600 to-teal-700"></div>
        <div className="w-32 h-32 rounded-[2.5rem] bg-white flex items-center justify-center text-emerald-700 text-5xl font-black mb-6 relative z-10 border-8 border-gray-50 shadow-2xl">
          {session.name[0]}
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none mb-2">{session.name}</h2>
        <p className="text-xs text-emerald-600 font-black uppercase tracking-[0.2em]">{employee?.role}</p>
        
        <div className="mt-12 w-full grid grid-cols-2 gap-4 text-left">
           <div className="p-5 bg-gray-50 rounded-[2rem]">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employee ID</p>
              <p className="text-sm font-black text-gray-900">{employee?.employee_code}</p>
           </div>
           <div className="p-5 bg-gray-50 rounded-[2rem]">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contact</p>
              <p className="text-sm font-black text-gray-900">{employee?.mobile}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Shift Timing</h3>
        </div>
        <div className="flex items-center justify-between pb-4 border-b border-gray-50">
           <span className="text-sm text-gray-500 font-bold">Punch-in Window</span>
           <span className="text-sm font-black text-gray-900">10:00 AM</span>
        </div>
        <div className="flex items-center justify-between">
           <span className="text-sm text-gray-500 font-bold">Punch-out Time</span>
           <span className="text-sm font-black text-emerald-600">06:00 PM</span>
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="w-full py-6 bg-rose-50 text-rose-600 font-black rounded-[2.5rem] border-2 border-rose-100 hover:bg-rose-100 transition-all shadow-lg shadow-rose-100/30 text-lg flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        Sign Out
      </button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col relative overflow-x-hidden selection:bg-emerald-100">
      {/* Dynamic Header */}
      <header className="px-8 pt-16 pb-8">
         <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
              Live Network
            </p>
            <div className="flex gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
               <div className="w-3 h-1.5 rounded-full bg-emerald-500"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
            </div>
         </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'HOME' && renderHome()}
        {activeTab === 'HISTORY' && renderHistory()}
        {activeTab === 'PROFILE' && renderProfile()}
      </main>

      {/* Glassmorphism Bottom Nav */}
      <div className="fixed bottom-8 left-6 right-6 z-40 max-w-[calc(448px-3rem)] mx-auto">
        <nav className="bg-white/80 backdrop-blur-3xl border border-white/50 rounded-[3rem] p-3 flex items-center justify-around shadow-2xl shadow-emerald-900/10">
          {[
            { id: 'HOME', icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ), label: 'Home' },
            { id: 'HISTORY', icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ), label: 'Logs' },
            { id: 'PROFILE', icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ), label: 'Profile' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex-1 flex flex-col items-center py-2 relative transition-all duration-500 ${activeTab === item.id ? 'text-emerald-600 scale-125' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {activeTab === item.id && (
                <div className="absolute -top-1 w-1 h-1 bg-emerald-600 rounded-full animate-pulse"></div>
              )}
              {item.icon}
              <span className={`text-[8px] font-black mt-1 uppercase tracking-widest transition-opacity duration-300 ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {showCamera.show && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
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
