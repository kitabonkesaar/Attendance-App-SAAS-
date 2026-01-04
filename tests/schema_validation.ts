
import { 
  Employee, 
  Skill, 
  Promotion, 
  Project, 
  ProjectAssignment, 
  PerformanceReview, 
  AuditLog,
  AccountStatus,
  ProjectStatus
} from '../types';

// TEST CASE 1: New Signup (Pending Approval)
const newSignup: Employee = {
  id: 'user-123',
  employee_code: 'EMP9999',
  name: 'John Doe',
  email: 'john@example.com',
  mobile: '1234567890',
  role: 'Staff',
  department: 'Engineering',
  joining_date: '2024-01-01',
  status: 'PENDING', // Valid new status
  shift_start: '09:00',
  shift_end: '18:00',
  created_at: new Date().toISOString(),
  address: '123 Main St',
  emergency_contact: 'Jane Doe (Wife) - 9876543210'
};

console.log('✅ New Signup Schema Validated');

// TEST CASE 2: Existing Employee with Extended Fields
const seniorEmployee: Employee = {
  id: 'user-456',
  employee_code: 'EMP001',
  name: 'Jane Smith',
  email: 'jane@example.com',
  mobile: '0987654321',
  role: 'Manager',
  department: 'Sales',
  joining_date: '2020-05-15',
  status: 'ACTIVE',
  shift_start: '09:00',
  shift_end: '18:00',
  created_at: '2020-05-15T09:00:00Z',
  manager_id: 'user-789', // Reporting to Director
  updated_at: new Date().toISOString()
};

const skills: Skill[] = [
  {
    id: 'skill-1',
    employee_id: seniorEmployee.id,
    skill_name: 'React',
    certification_url: 'https://cert.com/react',
    created_at: new Date().toISOString()
  }
];

const promotions: Promotion[] = [
  {
    id: 'promo-1',
    employee_id: seniorEmployee.id,
    previous_position: 'Junior Sales',
    new_position: 'Manager',
    promotion_date: '2022-01-01',
    reason: 'Excellent Performance',
    created_at: new Date().toISOString()
  }
];

const project: Project = {
  id: 'proj-1',
  name: 'Q4 Sales Drive',
  status: 'ACTIVE',
  created_at: new Date().toISOString()
};

const assignment: ProjectAssignment = {
  id: 'assign-1',
  project_id: project.id,
  employee_id: seniorEmployee.id,
  role_in_project: 'Team Lead',
  assigned_at: new Date().toISOString()
};

const review: PerformanceReview = {
  id: 'rev-1',
  employee_id: seniorEmployee.id,
  review_date: '2023-12-01',
  rating: 5,
  comments: 'Outstanding leadership',
  created_at: new Date().toISOString()
};

console.log('✅ Extended Employee Profile Validated');

// TEST CASE 3: Audit Log (New Schema)
const audit: AuditLog = {
  id: 'log-1',
  actor_id: 'admin-1',
  action: 'PROMOTE_EMPLOYEE',
  entity: 'Employee',
  entity_id: seniorEmployee.id,
  changes: {
    old_role: 'Junior Sales',
    new_role: 'Manager'
  },
  created_at: new Date().toISOString()
};

console.log('✅ Audit Log Schema Validated');
