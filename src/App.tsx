import React, { useState, useEffect } from 'react';
import { 
  Database, Calendar, Smartphone, Mail, RefreshCw, User, Bell, 
  MapPin, Clock, BookOpen, Key, ShieldCheck, Sparkles, CheckCircle2, 
  AlertTriangle, Users, Layers, ExternalLink, HelpCircle, Server, 
  Check, LogOut, CalendarDays, Phone, Inbox, AlertCircle, CalendarRange,
  Lock, FileText, CheckSquare, X, ShieldAlert, CheckSquare2
} from 'lucide-react';
import { 
  Instructor, FirstAidCourse, ScheduleAvailability, 
  AppNotification, AdminEmailLog, Dynamics365Config, SyncStats 
} from './types';
import PhoneFrame from './components/PhoneFrame';
import CRMSetupPanel from './components/CRMSetupPanel';
import AvailabilityCalendar from './components/AvailabilityCalendar';
import AdminMailboxSim from './components/AdminMailboxSim';
import CalendarView from './components/CalendarView';
import CourseRosterModal from './components/CourseRosterModal';

export default function App() {
  // Global Workspace database state loading
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<FirstAidCourse[]>([]);
  const [schedules, setSchedules] = useState<ScheduleAvailability[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [adminEmailLogs, setAdminEmailLogs] = useState<AdminEmailLog[]>([]);
  const [dynamics365Config, setDynamics365Config] = useState<Dynamics365Config>({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    environmentUrl: '',
    isConnected: false,
    activeEntityName: 'msevents_firstaidcourses',
    sendgridConfigured: false,
    integrationMode: 'demo'
  });

  // Client layout focus state switcher:
  // 'split' - side-by-side (default desktop)
  // 'admin' - dedicated Admin dashboard view
  // 'phone' - dedicated smartphone frame view
  const [layoutMode, setLayoutMode] = useState<'split' | 'admin' | 'phone'>('split');

  // Instructor Authenticated phone simulator state
  const [loggedInInstructor, setLoggedInInstructor] = useState<Instructor | null>(null);
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  
  // Auth Form parameters
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  
  // Simulated Toast/Message overlays specifically inside the phone frame
  const [phoneAlert, setPhoneAlert] = useState<{ type: 'success' | 'error' | 'sms'; msg: string } | null>(null);

  // Active highlighted course details inside phone frame
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<FirstAidCourse | null>(null);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  // General App configuration
  const [activeOS, setActiveOS] = useState<'ios_iphone' | 'android_pixel'>('ios_iphone');
  const [phoneActiveTab, setPhoneActiveTab] = useState<'calendar' | 'schedule' | 'notifications'>('calendar');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCourseFilter, setActiveCourseFilter] = useState<'All' | 'SFA' | 'BLS' | 'WFA'>('All');
  const [syncStats, setSyncStats] = useState<SyncStats>({
    lastSyncTime: 'Never',
    syncedCoursesCount: 0,
    syncedInstructorsCount: 0,
    syncStatus: 'idle'
  });

  // Load backend database state
  const fetchDatabaseState = async () => {
    try {
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error("Failed logging app state");
      const db = await res.json();
      setInstructors(db.instructors || []);
      setCourses(db.courses || []);
      setSchedules(db.schedules || []);
      setNotifications(db.notifications || []);
      setAdminEmailLogs(db.adminEmailLogs || []);
      setDynamics365Config(db.dynamics365Config || {
        tenantId: '',
        clientId: '',
        clientSecret: '',
        environmentUrl: '',
        isConnected: false,
        activeEntityName: 'msevents_firstaidcourses',
        sendgridConfigured: false,
        integrationMode: 'demo'
      });

      // Synchronize active logged in developer profile if already logged in
      if (loggedInInstructor) {
        const freshProfile = db.instructors.find((i: Instructor) => i.id === loggedInInstructor.id);
        if (freshProfile) setLoggedInInstructor(freshProfile);
      }
    } catch (err) {
      console.error("Failure pulling database state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseState();
  }, []);

  // Show a nicely timed phone alert
  const showPhoneAlert = (type: 'success' | 'error' | 'sms', msg: string) => {
    setPhoneAlert({ type, msg });
    if (type !== 'sms') {
      setTimeout(() => setPhoneAlert(null), 5000);
    }
  };

  // Submit Password-based Authentication
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid authentication details.");
      }
      setLoggedInInstructor(data.instructor);
      showPhoneAlert('success', `Welcome back, ${data.instructor.name}!`);
    } catch (err: any) {
      showPhoneAlert('error', err.message || "Email or password unrecognized.");
    }
  };

  // Dispatch Simulated SMS OTP Code
  const handleSendOtpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput) {
      showPhoneAlert('error', "Please enter your mobile phone number first.");
      return;
    }
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message);
      }
      setOtpSent(true);
      showPhoneAlert('sms', data.demoCode ? `Demo SMS Code: ${data.demoCode}` : data.message);
    } catch (err: any) {
      showPhoneAlert('error', err.message || "Phone number mismatch.");
    }
  };

  // Verify numerical OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, code: otpCodeInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message);
      }
      setLoggedInInstructor(data.instructor);
      setPhoneAlert(null); // clear SMS gateway notice
      setOtpSent(false);
      setOtpCodeInput('');
      showPhoneAlert('success', `Welcome back, ${data.instructor.name}! Demo OTP accepted.`);
    } catch (err: any) {
      showPhoneAlert('error', err.message || "Code invalid. Please retry.");
    }
  };

  // Quick bypass click cheats to easily log in as Marcus, Sarah or Alex
  const handleBypassTestLogin = (instructorId: string) => {
    const inst = instructors.find(i => i.id === instructorId);
    if (inst) {
      setLoggedInInstructor(inst);
      setEmailInput(inst.email);
      setPhoneInput(inst.phone);
      showPhoneAlert('success', `Simulating active viewport as ${inst.name}.`);
    }
  };

  // Accept or Decline pending course assignments (d)
  const handleRespondToAssignment = async (courseId: string, action: 'accept' | 'decline') => {
    if (!loggedInInstructor) return;
    try {
      const res = await fetch('/api/courses/respond-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, instructorId: loggedInInstructor.id, action })
      });
      if (!res.ok) throw new Error("Could not log response in CRM");
      const data = await res.json();
      
      // Update global tables
      await fetchDatabaseState();
      setSelectedCourseForDetail(null); // safely close specs overlay
      
      if (action === 'accept') {
        showPhoneAlert('success', dynamics365Config.isConnected ? "Course assignment accepted. Ready for Dataverse sync." : "Course assignment accepted in demo mode.");
      } else {
        const status = data.emailLogged?.status || 'Simulated';
        showPhoneAlert('success', `Opportunity declined. Admin alert status: ${status}.`);
      }
    } catch (err: any) {
      showPhoneAlert('error', err.message || "Action failed.");
    }
  };

  // Update CRM configuration (tenantId, sendgrid key, etc.)
  const handleUpdateDynamics365Config = async (newConfig: Partial<Dynamics365Config & { sendgridApiKey?: string }>) => {
    const res = await fetch('/api/dynamics365/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    });
    if (!res.ok) throw new Error("Configuration save failed");
    const data = await res.json();
    setDynamics365Config(data.config);
    return data;
  };

  // Run Dataverse API Sync process
  const handleTriggerSync = async () => {
    setSyncStats(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const res = await fetch('/api/dynamics365/sync', { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed CRM Sync process");
      }
      const data = await res.json();
      setSyncStats({
        lastSyncTime: new Date(data.timestamp).toLocaleTimeString(),
        syncedCoursesCount: data.syncedCoursesCount,
        syncedInstructorsCount: data.syncedInstructorsCount,
      syncStatus: data.mode === 'live' ? 'success' : 'error',
      errorMessage: data.mode === 'live' ? undefined : data.message
      });
      await fetchDatabaseState();
      return data;
    } catch (err: any) {
      setSyncStats(prev => ({ 
        ...prev, 
        syncStatus: 'error',
        errorMessage: err.message
      }));
      throw err;
    }
  };

  // Instructor updates schedule dates (triggers email logs and persists availability)
  const handleSaveInstructorSchedule = async (datesToAdd: string[], datesToRemove: string[]) => {
    if (!loggedInInstructor) return;
    const res = await fetch('/api/schedule/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instructorId: loggedInInstructor.id,
        datesToAdd,
        datesToRemove
      })
    });
    if (!res.ok) throw new Error("Could not submit availability update");
    const data = await res.json();
    await fetchDatabaseState();
    return data;
  };

  // Admin forces assignment
  const handleAssignInstructor = async (courseId: string, instructorId: string) => {
    const res = await fetch('/api/courses/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, instructorId })
    });
    if (!res.ok) throw new Error("Failed to assign first aid instructor");
    await fetchDatabaseState();
  };

  // Mark in-app push alerts as read inside phone
  const handleMarkNotificationRead = async (id: string) => {
    if (!loggedInInstructor) return;
    const res = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, instructorId: loggedInInstructor.id })
    });
    if (res.ok) {
      await fetchDatabaseState();
    }
  };

  const handleClearEmailLogs = async () => {
    const res = await fetch('/api/admin-email-logs/clear', { method: 'POST' });
    if (res.ok) {
      setAdminEmailLogs([]);
    }
  };

  const handleSaveRoster = async (courseId: string, trainees: FirstAidCourse['trainees']) => {
    const res = await fetch('/api/courses/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, trainees })
    });
    if (!res.ok) throw new Error("Could not save course roster");
    await fetchDatabaseState();
  };

  // Computed state derivations
  const currentInstructorNotifications = loggedInInstructor 
    ? notifications.filter(n => n.instructorId === loggedInInstructor.id)
    : [];

  const unreadNotificationsCount = currentInstructorNotifications.filter(n => !n.read).length;

  const filteredCourses = courses.filter(c => {
    if (activeCourseFilter === 'All') return true;
    return c.type === activeCourseFilter;
  });

  // Calculate pending invitations for active logged in instructor
  const pendingInvitations = loggedInInstructor 
    ? courses.filter(c => c.instructorId === loggedInInstructor.id && c.status === 'PendingAssignment')
    : [];

  const confirmedAssignments = loggedInInstructor
    ? courses.filter(c => c.instructorId === loggedInInstructor.id && c.status === 'Confirmed')
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-slate-100 gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold tracking-wider font-mono">LOADING SCHEDULING PORTAL...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Real-time sync tracker band */}
      <div className="bg-indigo-950/65 text-indigo-300 px-6 py-2 border-b border-indigo-900/35 flex justify-between items-center text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>DATAVERSE STATUS: {dynamics365Config.isConnected ? 'LIVE CONFIG READY' : 'DEMO MODE'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] opacity-80">Environment: <strong>{dynamics365Config.environmentUrl || 'Local demo data'}</strong></span>
          {dynamics365Config.sendgridConfigured && <span className="bg-indigo-900/50 text-indigo-200 border border-indigo-700/35 px-1.5 py-0.2 rounded-sm text-[9px] uppercase font-bold font-mono">SendGrid Ready</span>}
        </div>
      </div>

      {/* Main Engineering Dashboard Workspace Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 text-indigo-100 rounded-lg shadow-md shadow-indigo-950/40">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              ScheduleSync
              <span className="text-[10px] font-mono bg-indigo-950 border border-indigo-805 text-indigo-300 font-semibold px-2 py-0.5 rounded-md">
                Integration MVP
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Scheduling workflow with Dataverse and SendGrid hooks ready for IT credentials and schema mapping.
            </p>
          </div>
        </div>

        {/* Global layout segment switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setLayoutMode('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              layoutMode === 'split' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Split Executive Mode
          </button>
          <button
            onClick={() => setLayoutMode('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              layoutMode === 'admin' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            🏢 Office Registry Only
          </button>
          <button
            onClick={() => setLayoutMode('phone')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              layoutMode === 'phone' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            📱 Instructors App Only
          </button>
        </div>
      </header>

      {/* Primary Workspace Grid matching layouts selected */}
      <main className={`flex-1 grid grid-cols-1 ${
        layoutMode === 'split' ? 'lg:grid-cols-12' : layoutMode === 'admin' ? 'lg:grid-cols-2' : 'max-w-md mx-auto w-full'
      } gap-6 p-6 overflow-y-auto`}>
        
        {/* ==================================================================== */}
        {/* OFFICE ADMINISTRATION & CRM CONFIGURATION CENTER */}
        {/* ==================================================================== */}
        {(layoutMode === 'split' || layoutMode === 'admin') && (
          <section className={`${layoutMode === 'split' ? 'lg:col-span-7' : 'w-full'} space-y-6 flex flex-col h-full`}>
            
            {/* Split layout header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Server className="w-4 h-4 text-indigo-400" />
                Administrative Desk & CRM Configuration
              </h2>
              <button
                onClick={handleTriggerSync}
                className="text-[10px] bg-slate-950 hover:bg-slate-900 border border-slate-800 text-indigo-300 font-bold py-1 px-3 rounded-md transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStats.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                Test Dataverse Sync
              </button>
            </div>

            {/* Config setup panel widget */}
            <CRMSetupPanel 
              config={dynamics365Config}
              syncStats={syncStats}
              onUpdateConfig={handleUpdateDynamics365Config}
              onTriggerSync={handleTriggerSync}
            />

            {/* Middle Section: Courses registry assignment board */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 flex flex-col min-h-[350px]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                    <Database className="w-4.5 h-4.5 text-indigo-400" />
                    Azure Dataverse Course registry
                  </h3>
                  <p className="text-[10px] text-slate-400">Manage instructor requests and double-book validation</p>
                </div>

                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg text-[10px]">
                  {(['All', 'SFA', 'BLS', 'WFA'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveCourseFilter(filter)}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition uppercase ${
                        activeCourseFilter === filter ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of database courses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin pr-1 pb-2">
                {filteredCourses.map((c) => {
                  const assignedInst = instructors.find(i => i.id === c.instructorId);
                  const isPending = c.status === 'PendingAssignment';
                  const isConfirmed = c.status === 'Confirmed';

                  return (
                    <div 
                      key={c.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                        isConfirmed 
                          ? 'bg-slate-900/40 border-slate-850 hover:border-slate-800' 
                          : isPending 
                          ? 'bg-amber-950/20 border-amber-800/40'
                          : 'bg-indigo-950/15 border-indigo-900/40'
                      }`}
                    >
                      <div>
                        {/* Course Header */}
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">{c.code}</span>
                          <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isConfirmed ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/20' :
                            isPending ? 'bg-amber-950/60 text-amber-400 border border-amber-900/20 animate-pulse' :
                            'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            {c.status}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-100 leading-tight mb-2.5">{c.title}</h4>

                        {/* Date Coordinates */}
                        <div className="space-y-1 text-[10px] text-slate-400 font-mono mb-3 bg-slate-950/30 p-2 rounded-lg border border-slate-900">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{c.date} ({c.time})</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">{c.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Select Coordinator instructor action */}
                      <div className="border-t border-slate-900/80 pt-2.5 mt-1 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>Cert: <strong className="text-indigo-300 font-bold">{c.type} Level</strong></span>
                          <span>Reg: <strong className="text-slate-300">{c.currentlyRegistered}/{c.maxRegistered} Attendees</strong></span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-1.5 mt-1 text-[10px]">
                          <span className="text-slate-500 text-[9px] font-bold shrink-0">Dispatch:</span>
                          <select
                            value={c.instructorId || ''}
                            onChange={(e) => handleAssignInstructor(c.id, e.target.value)}
                            className="flex-1 bg-slate-900 text-slate-100 border border-slate-800 rounded px-1 px-1.5 py-0.5 text-[10px] focus:outline-hidden"
                          >
                            <option value="">-- UNASSIGNED --</option>
                            {instructors.map(inst => {
                              const isAvail = schedules.some(s => s.instructorId === inst.id && s.date === c.date && s.status === 'available');
                              return (
                                <option key={inst.id} value={inst.id}>
                                  {inst.name} {isAvail ? ' (FREE)' : ' (UNMARKED)'}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Email sandbox logs viewer */}
            <AdminMailboxSim 
              logs={adminEmailLogs}
              onClearLogs={handleClearEmailLogs}
            />

          </section>
        )}

        {/* ==================================================================== */}
        {/* INSTRUCTOR SMARTPHONE SIMULATION WORKSPACE */}
        {/* ==================================================================== */}
        {(layoutMode === 'split' || layoutMode === 'phone') && (
          <section className={`${layoutMode === 'split' ? 'lg:col-span-5' : 'w-full'} flex flex-col items-center justify-start h-full`}>
            
            {/* Smartphone view header spec */}
            <div className="w-full max-w-[360px] mb-3 flex items-center justify-between text-xs font-semibold px-2">
              <span className="text-slate-400 tracking-wider font-mono flex items-center gap-1">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Instructor Smartphone
              </span>
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-2 py-0.5 rounded-full font-mono">
                Port 3000 Active
              </span>
            </div>

            <PhoneFrame activeOS={activeOS} setActiveOS={setActiveOS}>
              <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 font-sans h-full overflow-hidden relative">
                
                {/* Simulated SMS Broadcast gateway overlay */}
                {phoneAlert && phoneAlert.type === 'sms' && (
                  <div className="absolute top-2 left-2 right-2 bg-indigo-600 border border-indigo-400 text-white rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top duration-300">
                    <div className="flex gap-2 items-start">
                      <Inbox className="w-4 h-4 shrink-0 text-yellow-300 mt-0.5" />
                      <div className="flex-1 text-[10px] font-sans">
                        <p className="font-bold flex justify-between items-center text-indigo-100 uppercase tracking-wider text-[8px]">
                          <span>💬 Simulated SMS Gateway</span>
                          <button onClick={() => setPhoneAlert(null)} className="p-0.5 bg-indigo-700 hover:bg-slate-800 rounded text-white text-[8px]">Dismiss</button>
                        </p>
                        <p className="mt-1 text-white leading-normal font-mono font-bold text-[10px] select-all bg-indigo-950 p-2 rounded-lg border border-indigo-700/50">
                          {phoneAlert.msg}
                        </p>
                        <p className="text-[8px] text-indigo-200 mt-1">Copy and paste this test OTP validation code underneath to bypass securely.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Normal transient Alerts */}
                {phoneAlert && phoneAlert.type !== 'sms' && (
                  <div className={`absolute top-2 left-2 right-2 p-3.5 rounded-xl z-50 text-[10px] font-medium leading-relaxed flex items-start gap-2 shadow-xl animate-in fade-in duration-250 ${
                    phoneAlert.type === 'success' 
                      ? 'bg-emerald-950 border border-emerald-800/80 text-emerald-300' 
                      : 'bg-rose-950 border border-rose-800/80 text-rose-300'
                  }`}>
                    {phoneAlert.type === 'success' ? <CheckSquare className="w-4 mr-0.5 h-4 shrink-0" /> : <AlertTriangle className="w-4 mr-0.5 h-4 shrink-0" />}
                    <span>{phoneAlert.msg}</span>
                  </div>
                )}

                {/* ======================================================= */}
                {/* VIEW 1: AUTHENTICATION LOCKSCREEN OVERLAY */}
                {/* ======================================================= */}
                {loggedInInstructor === null ? (
                  <div className="flex-1 flex flex-col justify-between p-5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black h-full overflow-y-auto">
                    
                    {/* Brand Banner */}
                    <div className="text-center mt-4">
                      <div className="w-11 h-11 bg-gradient-to-tr from-red-650 from-red-650 from-red-650 from-red-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-2">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-sm font-black text-slate-100 tracking-tight">ScheduleSync</h3>
                      <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest mt-0.5">Instructor Mobile Portal</p>
                    </div>

                    {/* Authentication modes switcher */}
                    <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 flex gap-1 my-4">
                      <button
                        onClick={() => { setAuthMode('password'); setOtpSent(false); }}
                        className={`flex-1 text-center py-1 rounded-lg text-[9px] font-bold uppercase transition ${
                          authMode === 'password' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🔐 Staff Password
                      </button>
                      <button
                        onClick={() => setAuthMode('otp')}
                        className={`flex-1 text-center py-1 rounded-lg text-[9px] font-bold uppercase transition ${
                          authMode === 'otp' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        📱 Mobile Phone OTP SMS
                      </button>
                    </div>

                    {/* AUTH FORMS CONTAINER */}
                    <div className="flex-1 flex flex-col justify-center max-h-[300px]">
                      {authMode === 'password' ? (
                        <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Coordinates</label>
                            <input
                              type="email"
                              required
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              placeholder="marcus.vance@firstaidpro.com"
                              className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Staff Password</label>
                            <input
                              type="password"
                              required
                              value={passwordInput}
                              onChange={(e) => setPasswordInput(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500"
                            />
                            <p className="text-[9px] text-slate-500 mt-1">Default test bypass password: <code className="bg-slate-900 px-1 py-0.5 rounded-sm font-mono text-[8px]">password123</code></p>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition cursor-pointer mt-3"
                          >
                            Unsecure Academy Key & Sign In
                          </button>
                        </form>
                      ) : (
                        <div className="space-y-3.5">
                          {!otpSent ? (
                            <form onSubmit={handleSendOtpCode} className="space-y-3">
                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">SMS Mobile Contact</label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                                    <Phone className="w-3.5 h-3.5" />
                                  </span>
                                  <input
                                    type="tel"
                                    required
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="+15552345678"
                                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-hidden focus:border-indigo-500"
                                  />
                                </div>
                                <p className="text-[8px] text-slate-400 leading-normal mt-1.5">
                                  Enter any active staff phone string. We'll simulate OData gateway dispatching verification token instantly to you.
                                </p>
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition cursor-pointer"
                              >
                                Request SMS Security Code
                              </button>
                            </form>
                          ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-3">
                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Enter 4-Digit OTP Code</label>
                                <input
                                  type="text"
                                  maxLength={4}
                                  required
                                  value={otpCodeInput}
                                  onChange={(e) => setOtpCodeInput(e.target.value)}
                                  placeholder="8431"
                                  className="w-full text-center font-mono text-lg tracking-widest bg-slate-900 border border-slate-800 text-slate-100 rounded-xl py-2.5 focus:outline-hidden focus:border-indigo-500"
                                />
                                <div className="flex justify-between items-center text-[9px] mt-1.5 px-1.5">
                                  <span className="text-slate-500">Code check active</span>
                                  <button onClick={() => setOtpSent(false)} className="text-indigo-400 hover:underline">Change Phone</button>
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition cursor-pointer"
                              >
                                Verify & Establish Mobile Session
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Preloaded test instructors list to simplify evaluation */}
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 mt-4 text-left">
                      <div className="flex items-center gap-1 mb-2 text-slate-350">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <h4 className="text-[9px] font-extrabold uppercase tracking-wider">Demo Quick Bypass (Tap One):</h4>
                      </div>
                      <div className="space-y-1.5 text-[10px]">
                        {instructors.slice(0, 3).map(inst => (
                          <button
                            key={inst.id}
                            onClick={() => handleBypassTestLogin(inst.id)}
                            className="w-full flex items-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-left transition"
                          >
                            <img src={inst.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-slate-800 shrink-0" />
                            <div className="flex-1 truncate">
                              <p className="font-bold text-slate-200 text-[10px] leading-tight truncate">{inst.name}</p>
                              <p className="text-[8px] text-slate-400 truncate">{inst.phone} • {inst.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Security credentials footnote */}
                    <p className="text-[8px] text-slate-500 text-center leading-relaxed">
                      Demo authentication is enabled for evaluation. Production should use Microsoft Entra SSO or IT-approved MFA.
                    </p>

                  </div>
                ) : (
                  // =======================================================
                  // VIEW 2: LOGGED-IN INSTRUCTOR PORTAL VIEW
                  // =======================================================
                  <div className="flex-1 flex flex-col justify-between h-full bg-slate-950">
                    
                    {/* Header inside phone Frame */}
                    <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={loggedInInstructor.avatar} 
                          alt="" 
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0" 
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-100 truncate pr-1">{loggedInInstructor.name}</h4>
                          <p className="text-[9px] text-slate-400 truncate">{loggedInInstructor.certificationLevel}</p>
                        </div>
                      </div>

                      {/* Log out option */}
                      <button 
                        onClick={() => {
                          setLoggedInInstructor(null);
                          setSelectedCourseForDetail(null);
                        }}
                        className="p-1 px-2.5 bg-slate-800 text-slate-350 hover:bg-rose-950/40 hover:text-rose-400 rounded-lg text-[9px] font-bold tracking-wider uppercase transition inline-flex items-center gap-1 shrink-0"
                        title="Sign Out of simulated phone"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Exit
                      </button>
                    </div>

                    {/* Central Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                      {/* ============================================== */}
                      {/* REQUIRED CORE COMPONENT: PENDING ASSIGNMENT CARDS */}
                      {/* ============================================== */}
                      {pendingInvitations.length > 0 && (
                        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3.5 space-y-3 shadow-xl relative overflow-hidden animate-bounce">
                          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
                          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-extrabold uppercase tracking-wide">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                            <span>{pendingInvitations.length} Pending Class Invitation Offer</span>
                          </div>

                          <div className="space-y-2.5">
                            {pendingInvitations.map((inv) => (
                              <div key={inv.id} className="bg-slate-900/90 border border-amber-900/20 p-3 rounded-lg text-left">
                                <span className="bg-amber-500/10 text-amber-400 text-[8px] font-mono px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider">{inv.code}</span>
                                <h5 className="text-[11px] font-bold text-slate-100 leading-snug mt-1.5">{inv.title}</h5>
                                
                                <div className="text-[9px] text-slate-400 space-y-1 my-2 bg-slate-950 p-2 rounded-md font-sans">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{inv.date} • {inv.time}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{inv.location}</span>
                                  </div>
                                </div>

                                <div className="flex gap-2 border-t border-slate-805 pt-2 mt-2">
                                  <button
                                    onClick={() => handleRespondToAssignment(inv.id, 'decline')}
                                    className="flex-1 bg-rose-950/60 hover:bg-rose-900/50 text-rose-300 font-bold py-1.5 rounded-lg text-[9px] transition uppercase cursor-pointer"
                                  >
                                    Decline Offer
                                  </button>
                                  <button
                                    onClick={() => handleRespondToAssignment(inv.id, 'accept')}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[9px] tracking-wide transition uppercase cursor-pointer shadow"
                                  >
                                    Accept Assignment
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* RENDERING INNER PHONE ACTIVE TABS */}
                      {phoneActiveTab === 'calendar' && (
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1">
                              <CalendarRange className="w-4 h-4 text-indigo-400" />
                              Assigned Class Calendar
                            </h4>
                            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Ready</span>
                          </div>

                          {/* Dual components - Calendar switcher & Confirmed list */}
                          <CalendarView 
                            courses={courses}
                            onSelectCourse={(c) => {
                              setSelectedCourseForDetail(c);
                            }}
                          />

                          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 mt-4 text-left">
                            <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">My Active Commitments</h5>
                            {courses.filter(c => c.instructorId === loggedInInstructor.id && c.status === 'Confirmed').length === 0 ? (
                              <p className="text-[9px] text-slate-500">No scheduled courses. Tap 'Accept' on course offers or configure availability.</p>
                            ) : (
                              <div className="space-y-2">
                                {courses.filter(c => c.instructorId === loggedInInstructor.id && c.status === 'Confirmed').map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => setSelectedCourseForDetail(c)}
                                    className="w-full flex items-center justify-between bg-slate-950 hover:bg-slate-900 border border-slate-850 p-2 rounded-lg text-left text-[10px] transition"
                                  >
                                    <div className="truncate pr-2">
                                      <p className="font-bold text-slate-200 truncate">{c.title}</p>
                                      <p className="text-[8px] text-slate-400">{c.date} • {c.location}</p>
                                    </div>
                                    <span className="text-[8px] shrink-0 bg-emerald-950 text-emerald-400 border border-emerald-900/20 px-1.5 py-0.2 rounded-sm font-semibold">Confirmed</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {phoneActiveTab === 'schedule' && (
                        <div className="space-y-3.5">
                          {/* Update My Availability Tab Grid */}
                          <AvailabilityCalendar 
                            instructor={loggedInInstructor}
                            schedules={schedules}
                            courses={courses}
                            onSaveSchedule={handleSaveInstructorSchedule}
                          />
                        </div>
                      )}

                      {phoneActiveTab === 'notifications' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Course alerts inbox</h4>
                            {currentInstructorNotifications.some(n => !n.read) && (
                              <button 
                                onClick={() => handleMarkNotificationRead('all')}
                                className="text-[9px] text-indigo-400 hover:underline"
                              >
                                Mark all as read
                              </button>
                            )}
                          </div>

                          {currentInstructorNotifications.length === 0 ? (
                            <div className="bg-slate-900 p-8 rounded-xl text-center text-slate-550 border border-slate-800 text-[10px]">
                              <Bell className="w-5 h-5 text-slate-700 mx-auto mb-1.5" />
                              <span>No recent notifications found.</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {currentInstructorNotifications.map(notif => (
                                <div 
                                  key={notif.id}
                                  onClick={() => handleMarkNotificationRead(notif.id)}
                                  className={`p-3 rounded-xl border text-xs cursor-pointer text-left transition ${
                                    notif.read ? 'bg-slate-900/40 border-slate-850 text-slate-400' : 'bg-indigo-950/20 border-indigo-900/35 text-slate-200'
                                  }`}
                                >
                                  <p className="font-bold text-[10px] text-slate-200 flex justify-between">
                                    <span>{notif.title}</span>
                                    <span className="text-[8px] font-mono opacity-80">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </p>
                                  <p className="text-[9px] text-slate-350 leading-relaxed mt-1">{notif.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                    {/* Inside Phone Navigation Tabs bottom panel */}
                    <div className="bg-slate-905 bg-slate-900 border-t border-slate-800 py-1.5 flex items-center justify-around text-[10px] font-medium sticky bottom-0 z-30">
                      <button
                        onClick={() => { setPhoneActiveTab('calendar'); setSelectedCourseForDetail(null); }}
                        className={`flex-1 py-1.5 flex flex-col items-center gap-1 transition ${
                          phoneActiveTab === 'calendar' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Calendar className="w-4 h-4 mx-auto" />
                        <span>Calendar</span>
                      </button>
                      <button
                        onClick={() => { setPhoneActiveTab('schedule'); setSelectedCourseForDetail(null); }}
                        className={`flex-1 py-1.5 flex flex-col items-center gap-1 transition ${
                          phoneActiveTab === 'schedule' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Clock className="w-4 h-4 mx-auto" />
                        <span>Availability</span>
                      </button>
                      <button
                        onClick={() => { setPhoneActiveTab('notifications'); setSelectedCourseForDetail(null); }}
                        className={`flex-1 py-1.5 flex flex-col items-center gap-1 transition relative ${
                          phoneActiveTab === 'notifications' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Bell className="w-4 h-4 mx-auto" />
                        {unreadNotificationsCount > 0 && (
                          <span className="absolute top-1.5 right-6 bg-red-500 w-2 h-2 rounded-full animate-ping" />
                        )}
                        <span>Alerts</span>
                      </button>
                    </div>

                    {/* FULL SCREEN DETAILED COURSE OVERLAY SLIDEUP DRAWER INSIDE SMARTPHONE */}
                    {selectedCourseForDetail && (
                      <div className="absolute inset-0 bg-slate-950/95 z-40 p-4 shrink-0 flex flex-col justify-between animate-in fade-in duration-200">
                        
                        <div className="text-left space-y-3 flex-1 overflow-y-auto">
                          {/* Drawer Header */}
                          <div className="flex justify-between items-start pb-2 border-b border-slate-900">
                            <div>
                              <span className="text-[8px] bg-indigo-900 text-indigo-300 font-mono px-2 py-0.5 rounded-sm uppercase font-bold tracking-widest">{selectedCourseForDetail.code}</span>
                              <h3 className="text-xs font-extrabold text-slate-100 leading-tight mt-1">{selectedCourseForDetail.title}</h3>
                            </div>
                            <button 
                              onClick={() => setSelectedCourseForDetail(null)}
                              className="p-1 hover:bg-slate-900 rounded-full text-slate-400"
                            >
                              <X className="w-4.5 h-4.5" />
                            </button>
                          </div>

                          {/* Specs Table */}
                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2.5 text-[10px] text-slate-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span className="font-semibold text-slate-200">{selectedCourseForDetail.date} ({selectedCourseForDetail.time})</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-200">{selectedCourseForDetail.location}</p>
                                <p className="text-[9px] text-slate-400 truncate">{selectedCourseForDetail.address}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                              <div>
                                <p className="font-semibold text-slate-200">Certification Category: <strong className="text-indigo-400">{selectedCourseForDetail.type}</strong></p>
                                <p className="text-[9px] text-slate-400">Generates national standard first aid qualifications.</p>
                              </div>
                            </div>
                          </div>

                          {/* Trainee Roster Summary & Trigger Button */}
                          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                            <div className="flex justify-between items-center mb-2 text-[10px]">
                              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-indigo-400" />
                                Interactive Trainees Desk
                              </span>
                              <span className="text-[9px] text-slate-400">{selectedCourseForDetail.currentlyRegistered} Registered</span>
                            </div>

                            <p className="text-[9px] text-slate-400 leading-normal mb-3">
                              Access trainee email addresses, phone contacts, employer details, and interactive pass/fail checkmarks.
                            </p>

                            <button
                              onClick={() => setIsRosterModalOpen(true)}
                              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-indigo-400 font-bold py-2 rounded-xl text-[10px] tracking-wide transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5" />
                              Open Live Active Student Roster
                            </button>
                          </div>
                        </div>

                        {/* Invitation Accept/Decline action block overlay if pending */}
                        {selectedCourseForDetail.status === 'PendingAssignment' ? (
                          <div className="bg-slate-900 border-t border-slate-850 p-2.5 rounded-xl mt-4 space-y-2">
                            <div className="text-[9px] text-amber-400 text-center font-bold">This assignment is pending. Please click below to respond.</div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRespondToAssignment(selectedCourseForDetail.id, 'decline')}
                                className="flex-1 bg-rose-950 text-rose-300 font-bold py-2 rounded-xl text-xs uppercase"
                              >
                                Decline Class
                              </button>
                              <button
                                onClick={() => handleRespondToAssignment(selectedCourseForDetail.id, 'accept')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs uppercase"
                              >
                                Accept Class
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 pt-3 border-t border-slate-900/80">
                            <button
                              onClick={() => setSelectedCourseForDetail(null)}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2 rounded-xl text-xs transition"
                            >
                              Back to Calendar
                            </button>
                          </div>
                        )}

                        {/* Modally render roster student checklists inside drawer */}
                        <CourseRosterModal 
                          course={selectedCourseForDetail}
                          isOpen={isRosterModalOpen}
                          onClose={() => setIsRosterModalOpen(false)}
                          onSaveRoster={handleSaveRoster}
                        />

                      </div>
                    )}

                  </div>
                )}

              </div>
            </PhoneFrame>
          </section>
        )}

      </main>

      {/* Solid administrative footer info details */}
      <footer className="bg-slate-950 text-slate-500 text-[10px] py-4 px-6 border-t border-slate-800 flex justify-between items-center text-center">
        <span>&copy; ScheduleSync. Dataverse integration service running on port 3000.</span>
        <span>Registered Environment ID: c6be3d7e-254a-467d-af85-2fa441304242</span>
      </footer>

    </div>
  );
}
