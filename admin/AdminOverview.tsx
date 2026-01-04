
import React, { useState, useEffect } from 'react';
import { DB } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { AttendanceStatus } from '../types';
import { getWorkforceInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0
  });
  const [insights, setInsights] = useState("Analyzing today's data...");
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'MOCK'>('DISCONNECTED');

  const fetchData = async () => {
    const employees = await DB.getEmployees();
    const attendance = await DB.getAttendance();
    const today = new Date().toISOString().split('T')[0];
    
    const todayRecs = attendance.filter(a => a.date === today);
    const present = todayRecs.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const late = todayRecs.filter(a => a.status === AttendanceStatus.LATE).length;
    const totalEmployees = employees.length;
    
    setStats({
      total: totalEmployees,
      present,
      late,
      absent: totalEmployees - (present + late)
    });

    const workforceInsights = await getWorkforceInsights(todayRecs);
    setInsights(workforceInsights);
  };

  useEffect(() => {
    fetchData();

    // Check if we are using the real Supabase client or the mock
    const isMock = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (isMock) {
      setConnectionStatus('MOCK');
      return;
    }

    // Set up Real-time listener
    const channel = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        { event: '*', table: 'attendance', schema: 'public' },
        (payload) => {
          fetchData(); // Re-sync data when any change happens
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('CONNECTED');
        } else {
          setConnectionStatus('DISCONNECTED');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const chartData = [
    { name: 'Present', value: stats.present, color: '#10b981' },
    { name: 'Late', value: stats.late, color: '#f59e0b' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Real-time Status Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">System Health</h4>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              connectionStatus === 'CONNECTED' ? 'bg-emerald-500' : 
              connectionStatus === 'MOCK' ? 'bg-amber-500' : 'bg-rose-500'
            }`}></div>
            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
              {connectionStatus === 'CONNECTED' ? 'Live Real-time Sync Active' : 
               connectionStatus === 'MOCK' ? 'Mock Mode (Local Only)' : 'Connection Interrupted'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { label: 'Workforce', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { label: 'Present', value: stats.present, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Late', value: stats.late, color: 'text-amber-600', bg: 'bg-amber-50', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Absent', value: stats.absent, color: 'text-rose-600', bg: 'bg-rose-50', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 lg:p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
              <div className={`${kpi.bg} ${kpi.color} p-3 rounded-2xl w-fit`}>
                <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={kpi.icon} />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{kpi.label}</p>
                <p className="text-xl lg:text-2xl font-black text-gray-900 leading-none">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content removed as per data removal request */}
      </div>
    </div>
  );
};

export default AdminOverview;
