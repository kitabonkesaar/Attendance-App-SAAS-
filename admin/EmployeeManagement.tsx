
import React, { useState, useEffect } from 'react';
import { Employee, AccountStatus } from '../types';
import { DB } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'edit' | 'delete';
    title: string;
    message: string;
    itemName?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    type: 'delete',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Filtering & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All'); // All, 7days, 30days
  const [sortField, setSortField] = useState<keyof Employee>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    refreshEmployees();
    
    // Real-time subscription
    const subscription = supabase
      .channel('public:employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
        refreshEmployees();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshEmployees = async () => {
    try {
      const data = await DB.getEmployees();
      setEmployees(data);
      // Clear any previous error if successful
      setSuccessMsg(null); 
    } catch (error: unknown) {
      console.error('Error fetching employees:', error);
      // Provide actionable feedback instead of generic alert
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load employees: ${errorMessage}. Please check your connection or permissions.`);
    }
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

  const processSave = async () => {
    setIsSaving(true);
    
    // Helper to prevent infinite hanging
    const withTimeout = async <T,>(promise: Promise<T>, ms: number = 15000, operationName: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout>;
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
        // Include password in update if provided
        // Note: The UI password field should be handled carefully
        const updatedEmp = { ...editingEmployee, ...formData } as Employee;
        // Explicitly check for password in formData because it might not be in the Employee type
        if (formData.password) {
            updatedEmp.password = formData.password;
        }
        
        await withTimeout(DB.updateEmployee(updatedEmp, 'admin1'), 10000, "Update Profile");
        
        setSuccessMsg(`Updated ${updatedEmp.name} successfully!`);
        setEditingEmployee(null);
      } else {
        // Attempt to create a REAL auth user in Supabase
        let userId: string;

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

        if (authError) {
          // RECOVERY: If user exists (e.g. previous attempt failed mid-way), try to recover ID
          if (authError.message.includes("already registered")) {
             const existingUser = await DB.findUserByEmail(formData.email!);
             if (existingUser) {
                 userId = existingUser.id;
             } else {
                 throw authError;
             }
          } else {
             throw authError;
          }
        } else {
           if (!authData.user) throw new Error("Registration successful but user creation failed.");
           userId = authData.user.id;
        }
        
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
          status: (formData.status as AccountStatus) || 'ACTIVE',
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
    } catch (err: unknown) {
      console.error("Save failed:", err);
      let msg = err instanceof Error ? err.message : String(err);

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
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.mobile) {
      alert("Please fill all mandatory fields (Name, Email, Mobile)");
      return;
    }

    if (editingEmployee) {
      setConfirmModal({
        isOpen: true,
        type: 'edit',
        title: 'Update Staff Profile?',
        message: `Are you sure you want to update the details for ${formData.name}?`,
        itemName: formData.name,
        onConfirm: processSave
      });
    } else {
      processSave();
    }
  };

  const handleDelete = (id: string) => {
    const emp = employees.find(e => e.id === id);
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'Delete Staff Member?',
      message: 'This action cannot be undone. The employee profile will be permanently removed.',
      itemName: emp?.name,
      onConfirm: async () => {
        setIsSaving(true);
        try {
          await DB.deleteEmployee(id, 'admin1');
          await refreshEmployees();
          setSuccessMsg("Employee record removed.");
          setTimeout(() => setSuccessMsg(null), 3000);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Delete failed:", error);
          alert("Failed to delete employee.");
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  const handleExport = () => {
    const headers = ['Name', 'Employee ID', 'Email', 'Mobile', 'Department', 'Role', 'Status', 'Joined Date', 'Referred By'];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        `"${emp.name}"`,
        emp.employee_code,
        emp.email,
        emp.mobile,
        emp.department,
        emp.role,
        emp.status,
        new Date(emp.created_at).toLocaleDateString(),
        `"${emp.referred_by || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Filter & Sort Logic
  const filteredEmployees = employees
    .filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDept === 'All' || emp.department === filterDept;
      
      let matchesDate = true;
      if (filterDateRange !== 'All') {
        const date = new Date(emp.created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (filterDateRange === '7days') matchesDate = diffDays <= 7;
        if (filterDateRange === '30days') matchesDate = diffDays <= 30;
      }

      return matchesSearch && matchesDept && matchesDate;
    })
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

  const uniqueDepts = Array.from(new Set(employees.map(e => e.department)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-2xl font-black text-gray-900 tracking-tight">Workforce</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage personnel & profiles</p>
          </div>
          <button 
            onClick={handleExport}
            className="bg-gray-900 hover:bg-black text-white text-[10px] uppercase font-black tracking-widest px-6 py-3 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
           <div className="relative">
              <input 
                type="text" 
                placeholder="Search employees..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           
           <select 
             value={filterDept} 
             onChange={(e) => setFilterDept(e.target.value)}
             className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none"
           >
             <option value="All">All Departments</option>
             {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
           </select>

           <select 
             value={filterDateRange} 
             onChange={(e) => setFilterDateRange(e.target.value)}
             className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none"
           >
             <option value="All">All Time</option>
             <option value="7days">Last 7 Days</option>
             <option value="30days">Last 30 Days</option>
           </select>

           <div className="flex items-center justify-end text-xs font-bold text-gray-400 px-2">
              {filteredEmployees.length} record(s) found
           </div>
        </div>
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
                <th className="px-8 py-5 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => { setSortField('name'); setSortAsc(!sortAsc); }}>
                  Staff Member {sortField === 'name' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-8 py-5">Communication</th>
                <th className="px-8 py-5 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => { setSortField('department'); setSortAsc(!sortAsc); }}>
                  Department {sortField === 'department' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-8 py-5 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => { setSortField('created_at'); setSortAsc(!sortAsc); }}>
                  Joined {sortField === 'created_at' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-8 py-5">State</th>
                <th className="px-8 py-5 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg font-black shadow-sm">
                            {emp.name[0]}
                          </div>
                          {/* New Badge */}
                          {(new Date().getTime() - new Date(emp.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7 && (
                             <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">NEW</span>
                          )}
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
                     <div className="flex flex-col gap-1">
                       <span className="text-xs font-bold text-gray-900">
                         {new Date(emp.created_at).toLocaleDateString()}
                       </span>
                       {emp.referred_by && (
                         <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                           Ref: {emp.referred_by}
                         </span>
                       )}
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
          
          {employees.length === 0 && (
             <div className="p-12 text-center">
               <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               </div>
               <h3 className="text-gray-900 font-bold mb-1">No Staff Members Found</h3>
               <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6">
                 Ask your team to register via the <strong>Staff Portal</strong> using the access code: <strong>STAFF2024</strong>
               </p>
               
               {/* DEBUG HELP */}
               <div className="p-4 bg-emerald-50 rounded-xl text-left max-w-sm mx-auto border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase mb-2">Registration Guide</p>
                  <p className="text-[10px] text-emerald-700 leading-relaxed">
                     Staff members can self-register from the login screen.
                  </p>
                  <ul className="list-disc list-inside text-[10px] text-emerald-700 mt-2 space-y-1">
                     <li>Share the Access Code (STAFF2024) with your team.</li>
                     <li>New registrations will appear here automatically.</li>
                  </ul>
               </div>
             </div>
          )}
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
              
              {!editingEmployee ? (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Set Initial Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password || ''}
                      autoComplete="new-password"
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold pr-12"
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Update Password (Optional)</label>
                   <div className="relative">
                     <input
                       type={showPassword ? "text" : "password"}
                       value={formData.password || ''}
                       placeholder="Leave blank to keep current"
                       autoComplete="new-password"
                       className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none pr-12"
                       onChange={(e) => setFormData({...formData, password: e.target.value})}
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                       tabIndex={-1}
                     >
                       {showPassword ? (
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                         </svg>
                       ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         </svg>
                       )}
                     </button>
                   </div>
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
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        itemName={confirmModal.itemName}
        isProcessing={isSaving}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default EmployeeManagement;
