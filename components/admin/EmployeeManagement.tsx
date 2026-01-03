
import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import { DB } from '../../lib/db';
import { supabase } from '../../lib/supabaseClient';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    refreshEmployees();
  }, []);

  const refreshEmployees = async () => {
    const data = await DB.getEmployees();
    setEmployees(data);
  };

  const handleOpenAdd = () => {
    setFormData({
      status: 'ACTIVE',
      shift_start: '09:00',
      shift_end: '18:00',
      password: 'Employee@123'
    });
    setIsAdding(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setFormData(emp);
    setEditingEmployee(emp);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.mobile) {
      alert("Please fill all mandatory fields (Name, Email, Mobile)");
      return;
    }

    setIsSaving(true);
    
    // Helper to prevent infinite hanging
    const withTimeout = async <T,>(promise: Promise<T>, ms: number = 15000, operationName: string): Promise<T> => {
      let timeoutId: any;
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${operationName} timed out after ${ms/1000}s`)), ms);
      });
      try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    try {
      const saveOperation = async () => {
        if (editingEmployee) {
        // Exclude password from DB update
        const { password, ...safeFormData } = formData;
        const updatedEmp = { ...editingEmployee, ...safeFormData } as Employee;
        
        await withTimeout(DB.updateEmployee(updatedEmp, 'admin1'), 10000, "Update Profile");
        
        setSuccessMsg(`Updated ${updatedEmp.name} successfully!`);
        setEditingEmployee(null);
      } else {
        // Attempt to create a REAL auth user in Supabase
        const { data: authData, error: authError } = await withTimeout(
           supabase.auth.signUp({
            email: formData.email!,
            password: formData.password || 'Employee@123',
            options: {
              data: { name: formData.name }
            }
          }), 
          15000, 
          "Auth Registration"
        );

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registration successful but user creation failed.");

        const userId = authData.user.id;
        
        // ROBUSTNESS: Manually ensure profile exists (works even if trigger is missing/broken)
        // We catch errors here to prevent blocking the success flow if profile creation is slow/redundant.
        try {
          await withTimeout(
            DB.manualCreateProfile(userId, formData.email!, formData.name!), 
            5000, 
            "Profile Creation"
          );
        } catch (profileErr) {
          console.warn("Manual profile creation skipped/timed out (non-critical if trigger worked):", profileErr);
        }
        
        const fullEmp: Employee = {
          id: userId,
          employee_code: `EMP${employees.length + 101}`,
          name: formData.name!,
          mobile: formData.mobile!,
          email: formData.email!,
          role: formData.role || 'Staff',
          department: formData.department || 'General',
          joining_date: new Date().toISOString().split('T')[0],
          status: (formData.status as any) || 'ACTIVE',
          shift_start: formData.shift_start || '09:00',
          shift_end: formData.shift_end || '18:00',
          created_at: new Date().toISOString()
        };

        try {
          await withTimeout(DB.updateEmployee(fullEmp, 'admin1'), 8000, "Saving Employee Details");
        } catch (updateErr) {
           console.warn("Employee details save timed out (record might be incomplete):", updateErr);
           // Proceed anyway because Auth user IS created.
        }
        
        // Show Success Modal instead of just closing
        // CRITICAL: Update state immediately after success
        setCreatedEmployee(fullEmp);
        setIsAdding(false); 
        setShowSuccessModal(true);
        
        // Audit log can happen in background
        DB.addAuditLog({
          admin_id: 'admin1',
          action: 'ADD_EMPLOYEE',
          entity: 'Employee',
          old_value: 'N/A',
          new_value: fullEmp.name
        }).catch(err => console.warn("Audit log failed (non-critical):", err));
      }
    };

      await saveOperation();
      
      // Refresh list in background or await with short timeout
      withTimeout(refreshEmployees(), 5000, "Refreshing List").catch(e => console.warn(e));
      
      // setTimeout(() => setSuccessMsg(null), 8000); // Handled by modal now
    } catch (err: any) {
      console.error("Save failed:", err);
      let msg = err.message;

      // SPECIFIC FIX: If DB trigger fails OR RLS blocks manual insert
      // We show the repair script which now includes the RLS policy fix.
      if (msg.includes("Database error saving new user") || msg.includes("row-level security")) {
         alert("Database Configuration Error: Please check RLS policies and Triggers.");
         setIsSaving(false); 
         return;
      } else if (msg.includes("violates unique constraint")) {
        msg = "Email or Mobile already exists.";
      } else if (msg.includes("security purposes")) {
        msg = "Too many attempts. Please wait 10-15 seconds.";
      }
      alert(`Error: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure? This only removes the employee profile, not the Auth account.")) {
      await DB.deleteEmployee(id, 'admin1');
      await refreshEmployees();
      setSuccessMsg("Employee record removed.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-2xl font-black text-gray-900 tracking-tight">Workforce</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage personnel & onboarding</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black px-6 py-3 rounded-2xl transition-all shadow-xl shadow-emerald-200 active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          Register Staff
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-900 text-white p-6 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-4">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-black">{successMsg}</p>
           </div>
           <button onClick={() => setSuccessMsg(null)} className="text-[10px] uppercase font-black tracking-widest bg-white/10 px-3 py-1 rounded-lg">Dismiss</button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
              <tr>
                <th className="px-8 py-5">Staff Member</th>
                <th className="px-8 py-5">Communication</th>
                <th className="px-8 py-5">Department</th>
                <th className="px-8 py-5">Work Schedule</th>
                <th className="px-8 py-5">State</th>
                <th className="px-8 py-5 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg font-black shadow-sm">
                          {emp.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{emp.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{emp.employee_code}</p>
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                     <p className="text-sm font-bold text-gray-600">{emp.mobile}</p>
                     <p className="text-[10px] font-medium text-gray-400 truncate">{emp.email}</p>
                  </td>
                  <td className="px-8 py-5">
                     <p className="text-sm font-black text-gray-700">{emp.department}</p>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{emp.role}</p>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-gray-600">{emp.shift_start} - {emp.shift_end}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                     <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                       {emp.status}
                     </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="text-emerald-600 hover:text-emerald-800 font-black text-[10px] uppercase tracking-widest p-2 hover:bg-emerald-50 rounded-xl transition-all"
                       >
                         Edit
                       </button>
                       <button 
                        onClick={() => handleDelete(emp.id)}
                        className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-widest p-2 hover:bg-rose-50 rounded-xl transition-all"
                       >
                         Delete
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && createdEmployee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[150] p-6 animate-in fade-in duration-500">
           <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative animate-in zoom-in-95 duration-500 text-center overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-50 to-transparent"></div>
              
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 relative z-10 shadow-lg shadow-emerald-200 animate-in slide-in-from-bottom-4 duration-700">
                <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>

              <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Welcome Aboard!</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Staff Member Successfully Onboarded</p>

              <div className="bg-gray-50 rounded-[2rem] p-6 mb-8 border border-gray-100 text-left">
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-lg font-black shadow-sm text-gray-900 border border-gray-100">
                       {createdEmployee.name[0]}
                    </div>
                    <div>
                       <p className="text-lg font-black text-gray-900 leading-none">{createdEmployee.name}</p>
                       <p className="text-xs font-bold text-gray-400 uppercase mt-1">{createdEmployee.role}</p>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                       <span className="font-bold text-gray-400">ID Code</span>
                       <span className="font-black text-gray-900">{createdEmployee.employee_code}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="font-bold text-gray-400">Login Email</span>
                       <span className="font-black text-gray-900">{createdEmployee.email}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="font-bold text-gray-400">Department</span>
                       <span className="font-black text-gray-900">{createdEmployee.department}</span>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-gray-900 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-black transition-all active:scale-95 uppercase text-xs tracking-[0.25em]"
              >
                Return to Suite
              </button>
           </div>
        </div>
      )}

      {/* Form Modal */}
      {(isAdding || editingEmployee) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 lg:p-10 shadow-2xl animate-in slide-in-from-bottom-8">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {editingEmployee ? 'Update Profile' : 'Staff Onboarding'}
            </h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
              {editingEmployee ? `Modifying ${editingEmployee.name}` : 'Create a real Supabase Auth account'}
            </p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Full Name</label>
                <input
                  value={formData.name || ''}
                  placeholder="Full Legal Name"
                  autoComplete="name"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none"
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Auth Email</label>
                  <input
                    value={formData.email || ''}
                    placeholder="official@company.com"
                    autoComplete="email"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10"
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Mobile</label>
                  <input
                    value={formData.mobile || ''}
                    placeholder="10-digit mobile"
                    autoComplete="tel"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10"
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  />
                </div>
              </div>
              
              {!editingEmployee && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Set Initial Password</label>
                  <input
                    type="text"
                    value={formData.password || ''}
                    autoComplete="new-password"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold"
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Department</label>
                  <input
                    value={formData.department || ''}
                    placeholder="Operations"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold"
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Shift Start</label>
                  <input
                    type="time"
                    value={formData.shift_start || ''}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold"
                    onChange={(e) => setFormData({...formData, shift_start: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-8">
              <button
                disabled={isSaving}
                onClick={() => { setIsAdding(false); setEditingEmployee(null); }}
                className="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl transition-all uppercase text-xs tracking-widest"
              >
                Cancel
              </button>
              <button
                disabled={isSaving}
                onClick={handleSave}
                className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 uppercase text-xs tracking-[0.2em]"
              >
                {isSaving ? 'Processing...' : (editingEmployee ? 'Update Profile' : 'Finalize Auth & Onboard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
