
export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  MANAGER = 'MANAGER'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  PENDING = 'PENDING'
}

export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  mobile: string;
  email: string;
  password?: string; // Optional, often handled by Auth provider
  role: string; // 'Staff', 'Manager', etc. (Display role)
  department: string;
  joining_date: string;
  status: AccountStatus;
  shift_start: string;
  shift_end: string;
  
  // Personal Info
  address?: string;
  emergency_contact?: string;
  
  // Hierarchy
  manager_id?: string;
  referred_by?: string;

  // Metadata
  created_at: string;
  updated_at?: string;
}

export interface Skill {
  id: string;
  employee_id: string;
  skill_name: string;
  certification_url?: string;
  issue_date?: string;
  expiry_date?: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  employee_id: string;
  previous_position: string;
  new_position: string;
  promotion_date: string;
  reason?: string;
  approved_by?: string;
  created_at: string;
}

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';

export interface Project {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  created_at: string;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  role_in_project?: string;
  assigned_at: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  review_date: string;
  rating: number; // 1-5
  comments?: string;
  reviewer_id?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  time: string;
  photo_url: string;
  latitude: number | null;
  longitude: number | null;
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
  admin_id?: string; // Legacy support
  actor_id?: string; // New schema
  action: string;
  entity: string; // or entity_type
  
  // Legacy fields
  old_value?: string;
  new_value?: string;
  
  // New schema
  entity_id?: string;
  changes?: Record<string, any>; // JSONB
  ip_address?: string;
  user_agent?: string;
  
  timestamp?: string; // Legacy
  created_at?: string; // New schema
}

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  employee_id?: string;
}
