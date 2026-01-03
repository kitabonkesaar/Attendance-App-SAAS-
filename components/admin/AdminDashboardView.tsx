
import React, { useState } from 'react';
import { UserSession } from '../../types';
import AdminOverview from './AdminOverview';
import EmployeeManagement from './EmployeeManagement';
import AttendanceLogs from './AttendanceLogs';
import AdminSettings from './AdminSettings';
import EmployeeAnalytics from './EmployeeAnalytics';

interface AdminDashboardViewProps {
  session: UserSession;
  onLogout: () => void;
}

const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EMPLOYEES' | 'ATTENDANCE' | 'ANALYTICS' | 'SETTINGS'>('OVERVIEW');

  const navItems = [
    { id: 'OVERVIEW', label: 'Dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { id: 'ANALYTICS', label: 'Analytics', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { id: 'EMPLOYEES', label: 'Staff', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { id: 'ATTENDANCE', label: 'Logs', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )},
    { id: 'SETTINGS', label: 'Rules', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )}
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'OVERVIEW': return <AdminOverview />;
      case 'EMPLOYEES': return <EmployeeManagement />;
      case 'ATTENDANCE': return <AttendanceLogs />;
      // case 'ANALYTICS': return <EmployeeAnalytics />;
      case 'SETTINGS': return <AdminSettings />;
      default: return <AdminOverview />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 overflow-hidden relative">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden lg:flex shrink-0">
        <div className="p-8">
          <h2 className="text-2xl font-black text-emerald-600 tracking-tight">Admin<span className="text-gray-900">Hub</span></h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Workforce Central</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-black rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-100">
           <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 mb-3 border border-gray-100">
             <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-emerald-200">
               {session.name[0]}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-xs font-black text-gray-900 truncate">{session.name}</p>
               <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{session.role}</p>
             </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full text-center py-2.5 text-xs font-black text-rose-500 hover:bg-rose-50 rounded-xl transition-colors uppercase tracking-widest"
           >
             Sign Out
           </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile Header */}
        <header className="h-20 lg:h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 shrink-0 sticky top-0 z-30">
           <div>
             <h3 className="text-xl lg:text-lg font-black text-gray-900 tracking-tight">
               {navItems.find(n => n.id === activeTab)?.label}
             </h3>
             <p className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Administrator</p>
           </div>
           <div className="flex items-center gap-4">
              <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                System Live
              </span>
              <button onClick={onLogout} className="lg:hidden p-2 text-gray-400 hover:text-rose-500 transition-colors">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
              </button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-32 lg:pb-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-40">
          <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-2.5 flex items-center justify-around shadow-2xl shadow-emerald-900/10">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-3xl transition-all duration-300 ${
                  activeTab === item.id 
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 scale-105' 
                    : 'text-gray-400'
                }`}
              >
                {item.icon}
                <span className={`text-[8px] font-black mt-1 uppercase tracking-widest transition-opacity ${activeTab === item.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                  {item.label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AdminDashboardView;
