export interface Trainee {
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: 'Registered' | 'Passed' | 'NoShow';
}

export interface Instructor {
  id: string; // Contact ID in D365
  name: string;
  email: string;
  phone: string;
  password?: string; // Saved by Admin
  avatar?: string;
  bio?: string;
  certificationLevel: string; // e.g. "Standard First Aid Instructor", "BLS Instructor", "Wilderness First Aid"
  certExpiry: string;
  otpCode?: string; // Active transient OTP for phone auth simulation
}

export interface FirstAidCourse {
  id: string; // Event/Booking ID in D365
  title: string;
  code: string; // course code
  type: 'SFA' | 'EFA' | 'BLS' | 'WFA' | 'CPR'; // Standard, Emergency, BLS, Wilderness, CPR
  date: string; // YYYY-MM-DD
  time: string; // "09:00 - 17:00"
  location: string;
  address: string;
  instructorId?: string; // Assigned instructor (contact ID)
  status: 'Draft' | 'PendingAssignment' | 'Confirmed' | 'Completed' | 'Cancelled';
  maxRegistered: number;
  currentlyRegistered: number;
  trainees?: Trainee[]; // Real list of course student attendees
}

export interface ScheduleAvailability {
  id: string;
  instructorId: string;
  date: string; // YYYY-MM-DD
  status: 'available' | 'busy' | 'tentative';
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  instructorId: string;
  title: string;
  message: string;
  type: 'assignment' | 'schedule_change' | 'system' | 'news';
  createdAt: string;
  read: boolean;
  courseId?: string;
}

export interface AdminEmailLog {
  id: string;
  timestamp: string;
  instructorName: string;
  actionType: 'addition' | 'removal' | 'batch_update';
  subject: string;
  bodyHtml: string;
  toEmail: string;
  status: 'Sent' | 'Simulated' | 'Failed';
  deliveryMessage?: string;
}

export interface Dynamics365Config {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  environmentUrl: string; // e.g. https://myorg.crm.dynamics.com
  isConnected: boolean;
  activeEntityName: string; // e.g. msevents_firstaidcourse, etc.
  sendgridConfigured?: boolean;
  integrationMode?: 'demo' | 'live-ready';
}

export interface SyncStats {
  lastSyncTime: string;
  syncedCoursesCount: number;
  syncedInstructorsCount: number;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}
