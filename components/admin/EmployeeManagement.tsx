
import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import { DB } from '../../lib/db';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    refreshEmployees();
  }, []);

  const refreshEmployees = () => {
    setEmployees(DB.getEmployees());
  };

  const handleOpenAdd = () => {
    setFormData({
      status: 'ACTIVE',
      shift_start: '10:00',
      shift_end: '18:00',
      password: 'Emp@123'
    });
    setIsAdding(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setFormData(emp);
    setEditingEmployee(emp);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.mobile) {
      alert("Please fill all mandatory fields (Name, Email, Mobile)");
      return;
    }

    if (editingEmployee) {
      const updatedEmp = { ...editingEmployee, ...formData } as Employee;
      DB.updateEmployee(updatedEmp, 'admin1');
      setSuccessMsg(`Updated ${updatedEmp.name} successfully!`);
      setEditingEmployee(null);
    } else {
      const fullEmp: Employee = {
        id: Math.random().toString(36).substr(2, 9),
        employee_code: `EMP${employees.length + 101}`,
        name: formData.name!,
        mobile: formData.mobile!,
        email: formData.email!,
        password: formData.password || 'Emp@123',
        role: formData.role || 'Staff',
        department: formData.department || 'General',
        joining_date: new Date().toISOString().split('T')[0],
        status: (formData.status as any) || 'ACTIVE',
        shift_start: formData.shift_start || '10:00',
        shift_end: formData.shift_end || '18:00',
        created_at: new Date().toISOString()
      };
      const updated = [...employees, fullEmp];
      DB.saveEmployees(updated);
      setIsAdding(false);
      setSuccessMsg(`Onboarded ${fullEmp.name} successfully! Password: ${fullEmp.password}`);
      DB.addAuditLog({
        admin_id: 'admin1',
        action: 'ADD_EMPLOYEE',
        entity: 'Employee',
        old_value: 'N/A',
        new_value: fullEmp.name
      });
    }
    
    refreshEmployees();
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this employee? This will remove their entire profile from the system.")) {
      DB.deleteEmployee(id, 'admin1');
      refreshEmployees();
      setSuccessMsg("Employee profile deleted.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-2xl font-black text-gray-900 tracking-tight">Workforce</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage active staff members</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black px-6 py-3 rounded-2xl transition-all shadow-xl shadow-emerald-200 active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
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
                <th className="px-8 py-5">Employee</th>
                <th className="px-8 py-5">Contact</th>
                <th className="px-8 py-5">Role/Dept</th>
                <th className="px-8 py-5">Shift</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg font-black shadow-sm">
                          {emp.name.split(' ').map(n => n[0]).join('')}
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
                     <p className="text-sm font-black text-gray-700">{emp.role}</p>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{emp.department}</p>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-2">
                       <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
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

      {/* Form Modal (Add/Edit) */}
      {(isAdding || editingEmployee) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 lg:p-10 shadow-2xl animate-in slide-in-from-bottom-8">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
              {editingEmployee ? 'Edit Profile' : 'New Onboarding'}
            </h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
              {editingEmployee ? `Modifying profile for ${editingEmployee.name}` : 'Register a member to the system'}
            </p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Full Name</label>
                <input
                  value={formData.name || ''}
                  placeholder="Full Legal Name"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all"
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Official Email</label>
                  <input
                    value={formData.email || ''}
                    placeholder="Official Email"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all"
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Mobile Number</label>
                  <input
                    value={formData.mobile || ''}
                    placeholder="Mobile Number"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all"
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Role</label>
                  <input
                    value={formData.role || ''}
                    placeholder="Designation"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold outline-none transition-all"
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Department</label>
                  <input
                    value={formData.department || ''}
                    placeholder="Department"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold outline-none transition-all"
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Shift Start</label>
                  <input
                    type="time"
                    value={formData.shift_start || ''}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold"
                    onChange={(e) => setFormData({...formData, shift_start: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Shift End</label>
                  <input
                    type="time"
                    value={formData.shift_end || ''}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold"
                    onChange={(e) => setFormData({...formData, shift_end: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Account Status</label>
                  <select
                    value={formData.status || 'ACTIVE'}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold outline-none"
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                {!editingEmployee && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Password</label>
                    <input
                      value={formData.password || ''}
                      placeholder="Emp@123"
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-bold"
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-8">
              <button
                onClick={() => { setIsAdding(false); setEditingEmployee(null); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-2xl transition-all uppercase text-xs tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 uppercase text-xs tracking-[0.2em]"
              >
                {editingEmployee ? 'Save Changes' : 'Finalize Onboarding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
