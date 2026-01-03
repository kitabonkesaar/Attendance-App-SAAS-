
import React, { useState, useEffect } from 'react';
import { Attendance, Employee, AttendanceStatus } from '../../types';
import { DB } from '../../lib/db';

const AttendanceLogs: React.FC = () => {
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Correction & Manual Entry Modal State
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualEntry, setManualEntry] = useState<Partial<Attendance>>({
    status: AttendanceStatus.PRESENT,
    date: new Date().toISOString().split('T')[0],
    time: '09:00:00',
    punch_out_time: ''
  });
  const [correctionReason, setCorrectionReason] = useState("");

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    // Fix: Await async database calls to get attendance and employees list
    const attendanceData = await DB.getAttendance();
    setLogs(attendanceData.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    const employeesData = await DB.getEmployees();
    setEmployees(employeesData);
  };

  const getEmpName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';

  const handleOpenManualModal = () => {
    setManualEntry({
      status: AttendanceStatus.PRESENT,
      date: filterDate,
      time: '09:00:00',
      punch_out_time: ''
    });
    setCorrectionReason("");
    setIsAddingManual(true);
  };

  const handleSaveCorrection = async () => {
    if (!editingRecord || !correctionReason.trim()) {
      alert("A reason for correction is mandatory.");
      return;
    }
    // Fix: Pass correct object properties and wait for updateAttendance promise to resolve
    await DB.updateAttendance(editingRecord.id, { 
      time: editingRecord.time,
      status: editingRecord.status,
      edit_reason: correctionReason,
      edited_by: 'admin1'
    }, 'admin1');
    setEditingRecord(null);
    setCorrectionReason("");
    await refreshData();
  };

  const handleSaveManual = async () => {
    if (!manualEntry.employee_id || !manualEntry.time || !correctionReason.trim()) {
      alert("Employee, Check-in Time, and Reason are mandatory.");
      return;
    }
    const newRecord: Omit<Attendance, 'id' | 'created_at'> = {
      employee_id: manualEntry.employee_id!,
      date: manualEntry.date!,
      time: manualEntry.time!.length === 5 ? manualEntry.time + ':00' : manualEntry.time!,
      punch_out_time: manualEntry.punch_out_time ? (manualEntry.punch_out_time.length === 5 ? manualEntry.punch_out_time + ':00' : manualEntry.punch_out_time) : undefined,
      photo_url: 'https://via.placeholder.com/150?text=MANUAL_ENTRY',
      latitude: null,
      longitude: null,
      device_id: 'ADMIN_DESKTOP',
      status: manualEntry.status as AttendanceStatus,
      edit_reason: correctionReason,
      edited_by: 'admin1'
    };
    // Fix: Use the standard saveAttendance method instead of non-existent addManualAttendance
    await DB.saveAttendance(newRecord);
    setIsAddingManual(false);
    setCorrectionReason("");
    await refreshData();
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm("Permanently delete this attendance record?")) {
      // Fix: Use deleteAttendance instead of the non-existent deleteAttendance (aliased from deleteEmployee) and await it
      await DB.deleteAttendance(id, 'admin1');
      await refreshData();
    }
  };

  const currentLogs = logs.filter(l => l.date === filterDate);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Calendar Filter</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white text-sm font-black transition-all"
            />
          </div>
          <button 
            onClick={handleOpenManualModal}
            className="mt-6 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            Manual Entry
          </button>
        </div>
        <button 
          onClick={() => {
            const headers = ['Employee', 'Date', 'Punch In', 'Punch Out', 'Status', 'Reason'];
            const rows = logs.map(l => [getEmpName(l.employee_id), l.date, l.time, l.punch_out_time || 'N/A', l.status, l.edit_reason || '']);
            const content = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([content], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance-report-${filterDate}.csv`;
            a.click();
          }}
          className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-gray-200 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Report
        </button>
      </div>

      <div className="hidden lg:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
              <tr>
                <th className="px-8 py-5">Verified Assets</th>
                <th className="px-8 py-5">Employee</th>
                <th className="px-8 py-5">Check In</th>
                <th className="px-8 py-5">Check Out</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex -space-x-3">
                      <button 
                        onClick={() => setSelectedPhoto(log.photo_url)}
                        className="w-12 h-12 rounded-xl border-[3px] border-white overflow-hidden shadow-lg hover:z-20 transition-all hover:scale-125"
                      >
                        <img src={log.photo_url} className="w-full h-full object-cover" alt="In" />
                      </button>
                      {log.punch_out_photo_url && (
                        <button 
                          onClick={() => setSelectedPhoto(log.punch_out_photo_url!)}
                          className="w-12 h-12 rounded-xl border-[3px] border-white overflow-hidden shadow-lg hover:z-20 transition-all hover:scale-125"
                        >
                          <img src={log.punch_out_photo_url} className="w-full h-full object-cover" alt="Out" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-gray-900">{getEmpName(log.employee_id)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{log.device_id}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-gray-700">{log.time.slice(0,5)}</p>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-0.5">Verified</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className={`text-sm font-black ${log.punch_out_time ? 'text-gray-700' : 'text-gray-200'}`}>
                      {log.punch_out_time?.slice(0,5) || '--:--'}
                    </p>
                    {log.punch_out_time && <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-0.5">Authenticated</p>}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${
                      log.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700' :
                      log.status === AttendanceStatus.LATE ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setEditingRecord(log); setCorrectionReason(log.edit_reason || ""); }}
                        className="text-emerald-600 hover:text-emerald-800 font-black text-[10px] uppercase tracking-widest p-2 hover:bg-emerald-50 rounded-xl"
                      >
                        Correct
                      </button>
                      <button 
                        onClick={() => handleDeleteRecord(log.id)}
                        className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-widest p-2 hover:bg-rose-50 rounded-xl"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {currentLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                       <svg className="w-12 h-12 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No shift records found for this date</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Addition Modal */}
      {isAddingManual && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-2xl font-black text-gray-900 tracking-tight">Add Manual Log</h3>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Directly inject attendance record</p>
              </div>
              <button onClick={() => setIsAddingManual(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Select Staff Member</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all"
                  value={manualEntry.employee_id || ""}
                  onChange={(e) => setManualEntry({ ...manualEntry, employee_id: e.target.value })}
                >
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Date</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" 
                    value={manualEntry.date} 
                    onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Status</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" 
                    value={manualEntry.status} 
                    onChange={(e) => setManualEntry({ ...manualEntry, status: e.target.value as any })}
                  >
                    {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Punch In</label>
                  <input 
                    type="time" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" 
                    value={manualEntry.time} 
                    onChange={(e) => setManualEntry({ ...manualEntry, time: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Punch Out (Opt)</label>
                  <input 
                    type="time" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" 
                    value={manualEntry.punch_out_time} 
                    onChange={(e) => setManualEntry({ ...manualEntry, punch_out_time: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Mandatory Reason</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold h-24 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all resize-none" 
                  placeholder="Explain why this entry is being added manually (e.g., App issue, forgot device)"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsAddingManual(false)} 
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveManual} 
                  className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Create Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Correct Record</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">{getEmpName(editingRecord.employee_id)} • {editingRecord.date}</p>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Punch In</label>
                  <input 
                    type="time" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-500/10" 
                    value={editingRecord.time.slice(0,5)} 
                    onChange={(e) => setEditingRecord({ ...editingRecord, time: e.target.value + ':00' })} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Status</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-500/10" 
                    value={editingRecord.status} 
                    onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
                  >
                    {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Reason for Correction (Mandatory)</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold h-24 outline-none focus:ring-4 focus:ring-emerald-500/10 resize-none" 
                  placeholder="Provide a valid administrative reason"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setEditingRecord(null)} 
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCorrection} 
                  className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200"
                >
                  Update Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[120] p-6 animate-in fade-in" onClick={() => setSelectedPhoto(null)}>
           <div className="relative max-w-lg w-full flex flex-col items-center gap-8 animate-in zoom-in-95">
              <img src={selectedPhoto} className="w-full rounded-[3rem] border-[10px] border-white/5 shadow-2xl" alt="Preview" />
              <button className="bg-white text-gray-900 font-black px-12 py-5 rounded-[2rem] shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest">Close Preview</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLogs;
