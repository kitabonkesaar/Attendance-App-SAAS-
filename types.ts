
export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  PENDING = 'PENDING'
}

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  mobile: string;
  email: string;
  password?: string; // For login
  role: string;
  department: string;
  joining_date: string;
  status: 'ACTIVE' | 'INACTIVE';
  shift_start: string; // HH:mm
  shift_end: string;   // HH:mm
  created_at: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  
  // Punch In Data
  time: string; // HH:mm:ss (Punch In Time)
  photo_url: string;
  latitude: number | null;
  longitude: number | null;
  
  // Punch Out Data
  punch_out_time?: string;
  punch_out_photo_url?: string;
  punch_out_latitude?: number | null;
  punch_out_longitude?: number | null;

  device_id: string;
  status: AttendanceStatus;
  edited_by?: string;
  edit_reason?: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'INFO' | 'HOLIDAY' | 'URGENT';
}

export interface AppSettings {
  attendance_window_start: string;
  attendance_window_end: string;
  late_threshold_minutes: number;
  location_mandatory: boolean;
  photo_mandatory: boolean;
  device_binding: boolean;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity: string;
  old_value: string;
  new_value: string;
  timestamp: string;
}

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  employee_id?: string;
}
