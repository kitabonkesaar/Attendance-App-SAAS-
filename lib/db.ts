
import { Employee, Attendance, AppSettings, AuditLog, AttendanceStatus, Announcement, Admin, UserRole } from '../types';

const STORAGE_KEYS = {
  EMPLOYEES: 'pa_employees',
  ATTENDANCE: 'pa_attendance',
  SETTINGS: 'pa_settings',
  AUDIT_LOGS: 'pa_audit_logs',
  ANNOUNCEMENTS: 'pa_announcements',
  ADMINS: 'pa_admins'
};

const DEFAULT_SETTINGS: AppSettings = {
  attendance_window_start: '09:00',
  attendance_window_end: '10:00',
  late_threshold_minutes: 15,
  location_mandatory: true,
  photo_mandatory: true,
  device_binding: true
};

const INITIAL_ADMINS: Admin[] = [
  {
    id: 'admin1',
    name: 'System Administrator',
    email: 'admin@photoattendance.com',
    password: 'Admin@123',
    role: UserRole.ADMIN
  }
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann1',
    title: 'Welcome to PhotoAttendance',
    content: 'Please ensure you mark your attendance daily before 10 AM to avoid late status.',
    date: new Date().toISOString(),
    type: 'INFO'
  }
];

export const DB = {
  getAdmins: (): Admin[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ADMINS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(INITIAL_ADMINS));
      return INITIAL_ADMINS;
    }
    return JSON.parse(data);
  },
  getEmployees: (): Employee[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
  },
  saveEmployees: (employees: Employee[]) => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  },
  updateEmployee: (emp: Employee, adminId: string) => {
    const employees = DB.getEmployees();
    const oldEmp = employees.find(e => e.id === emp.id);
    const updated = employees.map(e => e.id === emp.id ? emp : e);
    DB.saveEmployees(updated);
    DB.addAuditLog({
      admin_id: adminId,
      action: 'UPDATE_EMPLOYEE',
      entity: `Employee (${emp.employee_code})`,
      old_value: JSON.stringify(oldEmp),
      new_value: JSON.stringify(emp)
    });
  },
  deleteEmployee: (id: string, adminId: string) => {
    const employees = DB.getEmployees();
    const target = employees.find(e => e.id === id);
    const filtered = employees.filter(e => e.id !== id);
    DB.saveEmployees(filtered);
    DB.addAuditLog({
      admin_id: adminId,
      action: 'DELETE_EMPLOYEE',
      entity: `Employee Profile`,
      old_value: JSON.stringify(target),
      new_value: 'DELETED_PERMANENTLY'
    });
  },
  getAttendance: (): Attendance[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },
  saveAttendance: (attendance: Attendance[]) => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  },
  updateAttendance: (record: Attendance, adminId: string, reason: string) => {
    const all = DB.getAttendance();
    const oldRecord = all.find(a => a.id === record.id);
    const updated = all.map(a => a.id === record.id ? { ...record, edited_by: adminId, edit_reason: reason } : a);
    DB.saveAttendance(updated);
    DB.addAuditLog({
      admin_id: adminId,
      action: 'ATTENDANCE_CORRECTION',
      entity: `Log ID: ${record.id}`,
      old_value: JSON.stringify(oldRecord),
      new_value: JSON.stringify({ ...record, edit_reason: reason })
    });
  },
  addManualAttendance: (record: Attendance, adminId: string) => {
    const all = DB.getAttendance();
    DB.saveAttendance([...all, record]);
    DB.addAuditLog({
      admin_id: adminId,
      action: 'MANUAL_ENTRY_CREATION',
      entity: `Attendance Record`,
      old_value: 'N/A',
      new_value: JSON.stringify(record)
    });
  },
  deleteAttendance: (id: string, adminId: string) => {
    const all = DB.getAttendance();
    const target = all.find(a => a.id === id);
    const filtered = all.filter(a => a.id !== id);
    DB.saveAttendance(filtered);
    DB.addAuditLog({
      admin_id: adminId,
      action: 'DELETE_ATTENDANCE_RECORD',
      entity: `Log ID: ${id}`,
      old_value: JSON.stringify(target),
      new_value: 'REMOVED'
    });
  },
  getSettings: (): AppSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(data);
  },
  saveSettings: (settings: AppSettings, adminId: string) => {
    const old = DB.getSettings();
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    DB.addAuditLog({
      admin_id: adminId,
      action: 'UPDATE_SYSTEM_SETTINGS',
      entity: 'Global Config',
      old_value: JSON.stringify(old),
      new_value: JSON.stringify(settings)
    });
  },
  getAnnouncements: (): Announcement[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(INITIAL_ANNOUNCEMENTS));
      return INITIAL_ANNOUNCEMENTS;
    }
    return JSON.parse(data);
  },
  getAuditLogs: (): AuditLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : [];
  },
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const logs = DB.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([newLog, ...logs.slice(0, 99)])); // Keep last 100
  },
  verifyCredentials: (emailOrMobile: string, pass: string, role: UserRole) => {
    if (role === UserRole.ADMIN) {
      const admins = DB.getAdmins();
      return admins.find(a => a.email === emailOrMobile && a.password === pass);
    } else {
      const emps = DB.getEmployees();
      return emps.find(e => (e.email === emailOrMobile || e.mobile === emailOrMobile) && e.password === pass);
    }
  }
};
