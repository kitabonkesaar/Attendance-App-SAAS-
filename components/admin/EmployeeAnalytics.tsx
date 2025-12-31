
import React, { useState, useEffect } from 'react';
import { DB } from '../../lib/db';
import { Employee, Attendance } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface PerformanceRecord extends Employee {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  percentage: number;
  chartData: { name: string; value: number; color: string }[];
}

const EmployeeAnalytics: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceRecord[]>([]);
  const [daysPassed, setDaysPassed] = useState(1);
  const [selectedEmpLogs, setSelectedEmpLogs] = useState<{name: string, logs: Attendance[], record: PerformanceRecord} | null>(null);

  useEffect(() => {
    calculatePerformance();
  }, []);

  const calculatePerformance = () => {
    const employees = DB.getEmployees();
    const attendance = DB.getAttendance();
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayDate = now.getDate();
    setDaysPassed(todayDate);

    const data: PerformanceRecord[] = employees.map(emp => {
      const empRecords = attendance.filter(a => {
        const d = new Date(a.date);
        return a.employee_id === emp.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const present = empRecords.filter(r => r.status === 'PRESENT').length;
      const late = empRecords.filter(r => r.status === 'LATE').length;
      const totalAttended = present + late;
      const absent = Math.max(0, todayDate - totalAttended);
      
      const percentage = (totalAttended / todayDate) * 100;

      return {
        ...emp,
        presentCount: present,
        lateCount: late,
        absentCount: absent,
        percentage: Math.min(100, Math.round(percentage)),
        chartData: [
          { name: 'Present', value: present, color: '#10b981' },
          { name: 'Late', value: late, color: '#f59e0b' },
          { name: 'Absent', value: absent, color: '#ef4444' }
        ]
      };
    });

    setPerformanceData(data.sort((a, b) => b.percentage - a.percentage));
  };

  const downloadFullReport = () => {
    const headers = ['Rank', 'Name', 'Employee Code', 'Department', 'Role', 'Present Days', 'Late Days', 'Absent Days', 'Attendance %'];
    const rows = performanceData.map((emp, idx) => [
      idx + 1,
      emp.name,
      emp.employee_code,
      emp.department,
      emp.role,
      emp.presentCount,
      emp.lateCount,
      emp.absentCount,
      `${emp.percentage}%`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Full_Workforce_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const downloadIndividualReport = (emp: PerformanceRecord) => {
    const attendance = DB.getAttendance();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const empLogs = attendance.filter(a => {
      const d = new Date(a.date);
      return a.employee_id === emp.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).sort((a, b) => b.date.localeCompare(a.date));

    const headers = ['Date', 'Punch In', 'Punch Out', 'Status', 'Latitude', 'Longitude'];
    const rows = empLogs.map(l => [
      l.date,
      l.time,
      l.punch_out_time || 'N/A',
      l.status,
      l.latitude || 'N/A',
      l.longitude || 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${emp.name.replace(/\s+/g, '_')}_${new Date().toLocaleString('default', { month: 'short' })}.csv`;
    a.click();
  };

  const viewIndividualLogs = (emp: PerformanceRecord) => {
    const attendance = DB.getAttendance();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const empLogs = attendance.filter(a => {
      const d = new Date(a.date);
      return a.employee_id === emp.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).sort((a, b) => b.date.localeCompare(a.date));

    setSelectedEmpLogs({ name: emp.name, logs: empLogs, record: emp });
  };

  const getStatusColor = (percent: number) => {
    if (percent >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (percent >= 75) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  const getBarColor = (percent: number) => {
    if (percent >= 90) return 'bg-emerald-500';
    if (percent >= 75) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-2xl font-black text-gray-900 tracking-tight">Performance Analytics</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Attendance scores for the current month</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadFullReport}
            className="hidden sm:flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Summary
          </button>
          <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-xs font-black text-gray-900">1st - {daysPassed}th {new Date().toLocaleString('default', { month: 'short' })}</p>
          </div>
        </div>
      </div>

      <button 
        onClick={downloadFullReport}
        className="sm:hidden w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 active:scale-95"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download Monthly Summary
      </button>

      {/* Desktop Analysis Table */}
      <div className="hidden lg:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
            <tr>
              <th className="px-8 py-5">Employee Rank</th>
              <th className="px-8 py-5">Monthly Score</th>
              <th className="px-8 py-5">Visual Breakdown</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {performanceData.map((emp, index) => (
              <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-5">
                   <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-gray-300 w-4">#{index + 1}</span>
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-emerald-600 text-xs shadow-inner">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">{emp.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{emp.employee_code}</p>
                      </div>
                   </div>
                </td>
                <td className="px-8 py-5">
                   <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[120px]">
                        <div 
                          className={`h-full transition-all duration-1000 ${getBarColor(emp.percentage)}`} 
                          style={{ width: `${emp.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-black text-gray-900">{emp.percentage}%</span>
                   </div>
                </td>
                <td className="px-8 py-5">
                   <div className="w-40 h-12">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={emp.chartData} layout="vertical">
                         <XAxis type="number" hide />
                         <YAxis type="category" dataKey="name" hide />
                         <Tooltip 
                           contentStyle={{ borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                           cursor={{ fill: 'transparent' }}
                         />
                         <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                           {emp.chartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </td>
                <td className="px-8 py-5 text-right">
                   <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => viewIndividualLogs(emp)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" 
                        title="View Logs"
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button 
                        onClick={() => downloadIndividualReport(emp)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" 
                        title="Download Report"
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Analysis Cards */}
      <div className="lg:hidden space-y-4">
        {performanceData.map((emp, index) => (
          <div key={emp.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
             <div className="absolute -top-4 -right-2 text-6xl font-black text-gray-50/80">
               #{index + 1}
             </div>

             <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-3xl bg-gray-50 flex items-center justify-center text-emerald-600 text-xl font-black border border-gray-100">
                  {emp.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h5 className="font-black text-gray-900 leading-none">{emp.name}</h5>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">{emp.percentage}% Attendance</p>
                </div>
             </div>

             <div className="h-40 w-full mb-6 relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={emp.chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                   <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                     itemStyle={{ fontSize: '10px', fontWeight: 'black' }}
                   />
                   <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                     {emp.chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>

             <div className="mt-4 flex gap-2 relative z-10">
                <button 
                  onClick={() => viewIndividualLogs(emp)}
                  className="flex-1 bg-gray-50 text-gray-900 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2"
                >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                   Full Logs
                </button>
             </div>
          </div>
        ))}
      </div>

      {/* Log Detail Modal */}
      {selectedEmpLogs && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 lg:p-10 animate-in fade-in">
           <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                 <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedEmpLogs.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Detailed Logs for {new Date().toLocaleString('default', { month: 'long' })}</p>
                 </div>
                 <button 
                   onClick={() => setSelectedEmpLogs(null)}
                   className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
                 >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
                 <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Distribution Overview</h4>
                    <div className="h-64 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={selectedEmpLogs.record.chartData}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} />
                             <YAxis axisLine={false} tickLine={false} />
                             <Tooltip cursor={{ fill: '#f1f5f9' }} />
                             <Bar dataKey="value" barSize={60} radius={[10, 10, 0, 0]}>
                                {selectedEmpLogs.record.chartData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedEmpLogs.logs.map(log => (
                       <div key={log.id} className="p-5 rounded-3xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all group">
                          <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                                   {new Date(log.date).getDate()}
                                </div>
                                <div>
                                   <p className="text-xs font-black text-gray-900">{new Date(log.date).toLocaleString('default', { weekday: 'short' })}</p>
                                   <p className="text-[10px] text-gray-400 font-bold uppercase">{log.date}</p>
                                </div>
                             </div>
                             <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                             }`}>
                                {log.status}
                             </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-4">
                             <div className="bg-white p-2 rounded-xl border border-gray-100">
                                <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">In</p>
                                <p className="text-xs font-black text-gray-900">{log.time.slice(0,5)}</p>
                             </div>
                             <div className="bg-white p-2 rounded-xl border border-gray-100">
                                <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Out</p>
                                <p className="text-xs font-black text-gray-900">{log.punch_out_time?.slice(0,5) || '--:--'}</p>
                             </div>
                          </div>

                          <div className="flex gap-2">
                             <img src={log.photo_url} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm" alt="In" />
                             {log.punch_out_photo_url && <img src={log.punch_out_photo_url} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm" alt="Out" />}
                          </div>
                       </div>
                    ))}
                    {selectedEmpLogs.logs.length === 0 && (
                       <div className="col-span-full py-20 text-center">
                          <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No detailed logs available for this period</p>
                       </div>
                    )}
                 </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Days Recorded: {selectedEmpLogs.logs.length}</p>
                 <button 
                   onClick={() => setSelectedEmpLogs(null)}
                   className="bg-gray-900 text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-gray-200"
                 >
                    Done
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAnalytics;
