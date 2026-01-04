import React, { useState, useEffect } from 'react';
import { DB } from '../lib/db';
import { Employee, Attendance, AttendanceStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface PerformanceRecord extends Employee {
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  absentCount: number;
  percentage: number;
  chartData: { name: string; value: number; color: string }[];
}

const EmployeeAnalytics: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmpLogs, setSelectedEmpLogs] = useState<{name: string, logs: Attendance[], record: PerformanceRecord} | null>(null);

  useEffect(() => {
    calculatePerformance();
  }, []);

  const getWorkingDaysCount = (date: Date): number => {
    let count = 0;
    const cur = new Date(date.getFullYear(), date.getMonth(), 1);
    // Loop until yesterday to calculate completed working days, or include today? 
    // Usually analytics includes today if checking live, but "absent" for today might be premature if it's morning.
    // Let's include today for now.
    while (cur <= date) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const calculatePerformance = async () => {
    setIsLoading(true);
    try {
      const allEmployees = await DB.getEmployees();
      const employees = allEmployees.filter(e => e.status === 'ACTIVE');
      const attendance = await DB.getAttendance();
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const workingDays = getWorkingDaysCount(now);

      const data: PerformanceRecord[] = employees.map(emp => {
        const empRecords = attendance.filter(a => {
          const d = new Date(a.date);
          return a.employee_id === emp.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const present = empRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
        const late = empRecords.filter(r => r.status === AttendanceStatus.LATE).length;
        const halfDay = empRecords.filter(r => r.status === AttendanceStatus.HALF_DAY).length;
        
        const totalAttended = present + late + halfDay;
        
        // Calculate absent based on expected working days
        const absent = Math.max(0, workingDays - totalAttended);
        
        // Weighted score: Present/Late = 1, Half Day = 0.5
        const effectiveScore = present + late + (halfDay * 0.5);
        const percentage = workingDays > 0 ? (effectiveScore / workingDays) * 100 : 100;

        return {
          ...emp,
          presentCount: present,
          lateCount: late,
          halfDayCount: halfDay,
          absentCount: absent,
          percentage: Math.min(100, Math.round(percentage)),
          chartData: [
            { name: 'Present', value: present, color: '#10b981' },
            { name: 'Late', value: late, color: '#f59e0b' },
            { name: 'Half Day', value: halfDay, color: '#6366f1' },
            { name: 'Absent', value: absent, color: '#ef4444' }
          ]
        };
      });

      setPerformanceData(data.sort((a, b) => b.percentage - a.percentage));
    } catch (error) {
      console.error("Failed to calculate performance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFullReport = () => {
    const headers = ['Rank', 'Name', 'Employee Code', 'Department', 'Role', 'Present', 'Late', 'Half Day', 'Absent', 'Performance %'];
    const rows = performanceData.map((emp, idx) => [
      idx + 1,
      emp.name,
      emp.employee_code,
      emp.department,
      emp.role,
      emp.presentCount,
      emp.lateCount,
      emp.halfDayCount,
      emp.absentCount,
      `${emp.percentage}%`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Workforce_Performance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const viewIndividualLogs = async (emp: PerformanceRecord) => {
    const attendance = await DB.getAttendance();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const empLogs = attendance.filter(a => {
      const d = new Date(a.date);
      return a.employee_id === emp.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).sort((a, b) => b.date.localeCompare(a.date));

    setSelectedEmpLogs({ name: emp.name, logs: empLogs, record: emp });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent animate-spin rounded-full"></div>
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Aggregating Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-2xl font-black text-gray-900 tracking-tight">Monthly Performance</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Personnel scoring for the current month</p>
        </div>
        <button 
          onClick={downloadFullReport}
          className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Analytics
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {performanceData.map((emp, idx) => (
          <div key={emp.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
               <span className="text-8xl font-black italic">#{idx + 1}</span>
             </div>

             <div className="flex flex-col md:flex-row gap-6 relative z-10">
                <div className="flex-1 space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg font-black">
                        {emp.name[0]}
                      </div>
                      <div>
                        <h5 className="font-black text-gray-900 text-sm leading-none">{emp.name}</h5>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{emp.department}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-4 gap-2">
                      <div className="bg-gray-50 p-3 rounded-xl text-center">
                         <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Present</p>
                         <p className="text-sm font-black text-emerald-600">{emp.presentCount}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl text-center">
                         <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Late</p>
                         <p className="text-sm font-black text-amber-600">{emp.lateCount}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl text-center">
                         <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Half Day</p>
                         <p className="text-sm font-black text-indigo-500">{emp.halfDayCount}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl text-center">
                         <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Absent</p>
                         <p className="text-sm font-black text-rose-500">{emp.absentCount}</p>
                      </div>
                   </div>

                   <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-900 uppercase">Score</span>
                        <span className={`text-[10px] font-black ${emp.percentage > 85 ? 'text-emerald-600' : 'text-amber-600'}`}>{emp.percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${emp.percentage > 85 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${emp.percentage}%` }}></div>
                      </div>
                   </div>

                   <button 
                    onClick={() => viewIndividualLogs(emp)}
                    className="w-full bg-gray-900 text-white text-[9px] font-black py-3 rounded-xl uppercase tracking-widest hover:bg-black transition-all"
                   >
                     View Details
                   </button>
                </div>

                <div className="w-full md:w-32 h-32 bg-gray-50 rounded-2xl p-2 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={emp.chartData}>
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {emp.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        ))}
      </div>

      {selectedEmpLogs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <header className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-none">{selectedEmpLogs.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Detailed Log Summary</p>
                </div>
                <button onClick={() => setSelectedEmpLogs(null)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </header>
             <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                {selectedEmpLogs.logs.map(log => (
                  <div key={log.id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={log.photo_url} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="text-xs font-black text-gray-900">{new Date(log.date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{log.time} — {log.punch_out_time || 'Present'}</p>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${
                      log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                      log.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                      log.status === 'HALF_DAY' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {log.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
             </div>
             <footer className="p-6 bg-gray-50 text-center">
                <button 
                  onClick={() => setSelectedEmpLogs(null)}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-xl"
                >
                  Close Insights
                </button>
             </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAnalytics;