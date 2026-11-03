"use client";

import { useEffect, useState, useMemo, useTransition, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  Profile,
  AttendanceLog,
  GeofenceSettings,
  LeaveRequest,
  NotificationRecord,
} from '@/types';
import {
  getWibDate,
  formatWibTime,
  formatWibDate,
  getMonthRangeWib,
  getTodayRangeWib,
  getLast7DaysWib,
  INDONESIAN_MONTHS,
} from '@/lib/date';

// Admin Modular Components
import { AdminSidebar, AdminTab } from '@/components/admin/AdminSidebar';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { EmployeeManager } from '@/components/admin/EmployeeManager';
import { MonthlyRecapGrid } from '@/components/admin/MonthlyRecapGrid';
import { GeofenceSettingsCard } from '@/components/admin/GeofenceSettingsCard';
import { PayslipManager } from '@/components/admin/PayslipManager';
import { NotificationManager } from '@/components/admin/NotificationManager';
import { LeaveManager } from '@/components/admin/LeaveManager';
import {
  AdminLogoutModal,
  DeleteEmployeeModal,
  ResetEmployeesModal,
} from '@/components/admin/AdminModals';

export default function AdminPage() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [configured] = useState(() => isSupabaseConfigured());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Tabs navigation
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  // Stats State
  const [stats, setStats] = useState({
    totalEmployees: 0,
    checkedIn: 0,
    late: 0,
    absent: 0
  });

  const [weeklyStats, setWeeklyStats] = useState<{ date: string; hadir: number }[]>([]);

  // Data lists
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);

  // Geofence configuration form
  const [geofence, setGeofence] = useState<GeofenceSettings>({
    id: 1,
    factory_lat: -7.7828,
    factory_lon: 110.3608,
    radius_meters: 50,
    work_start_time: '08:00',
    work_end_time: '17:00',
    saturday_work_start_time: '08:00',
    saturday_work_end_time: '12:00',
    break_start_time: '12:00',
    break_end_time: '13:00',
    late_tolerance_minutes: 15,
    overtime_threshold_minutes: 30
  });
  const [geofenceLoading, setGeofenceLoading] = useState(false);
  const [geofenceMessage, setGeofenceMessage] = useState('');

  // Register Employee form
  const [newNik, setNewNik] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [regLoading, setRegLoading] = useState(false);
  const [regFeedback, setRegFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Excel Import states
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Edit & Delete Employee states
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Profile | null>(null);
  const [visiblePasscodes, setVisiblePasscodes] = useState<Record<string, boolean>>({});
  const [showResetModal, setShowResetModal] = useState(false);

  // Monthly Recap states
  const [recapMonth, setRecapMonth] = useState<number>(() => getWibDate().getMonth());
  const [recapYear, setRecapYear] = useState<number>(() => getWibDate().getFullYear());
  const [recapLogs, setRecapLogs] = useState<AttendanceLog[]>([]);
  const [recapLoading, setRecapLoading] = useState<boolean>(false);
  const [showResetRecapModal, setShowResetRecapModal] = useState(false);
  const [resetRecapLoading, setResetRecapLoading] = useState(false);
  const [exportRecapLoading, setExportRecapLoading] = useState(false);

  // Payslip (Slip Gaji) states
  const [payslipList, setPayslipList] = useState<{ period_month: number; period_year: number; period_label: string; count: number; uploaded_at: string }[]>([]);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [payslipImportLoading, setPayslipImportLoading] = useState(false);
  const [payslipImportProgress, setPayslipImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [payslipFeedback, setPayslipFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [payslipMonth, setPayslipMonth] = useState<number>(() => getWibDate().getMonth());
  const [payslipYear, setPayslipYear] = useState<number>(() => getWibDate().getFullYear());
  const [payslipLabel, setPayslipLabel] = useState<string>('Awal');
  const [deletingPeriod, setDeletingPeriod] = useState<{ month: number; year: number; label: string } | null>(null);
  // Date-range for recap summary (day numbers within the selected month)
  const [recapStartDay, setRecapStartDay] = useState<number>(1);
  const [recapEndDay, setRecapEndDay] = useState<number>(() => {
    const d = getWibDate();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  });

  // Notifications states
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Leave Management States
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveActionLoading, setLeaveActionLoading] = useState(false);
  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifMessage, setNewNotifMessage] = useState('');
  const [newNotifType, setNewNotifType] = useState<'info'|'warning'|'success'>('info');
  const [newNotifTarget, setNewNotifTarget] = useState<string>(''); // empty string means broadcast
  const [notifFeedback, setNotifFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Manual Attendance Correction states
  const [editingCell, setEditingCell] = useState<{
    employee: Profile;
    day: number;
    log?: AttendanceLog;
  } | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState('Tepat Waktu');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Employee filter & sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'excel' | 'name' | 'nik'>('newest');

  // Date String
  const [dateString] = useState(() =>
    formatWibDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  );

  // Request counter to avoid race conditions when switching months/years rapidly
  const recapRequestIdRef = useRef(0);

  // ── Hoisted Data Loaders ──────────────────────────────────────────────────
  const loadMonthlyRecap = async (month: number, year: number) => {
    const reqId = ++recapRequestIdRef.current;
    setRecapLoading(true);
    try {
      const { start, end } = getMonthRangeWib(year, month);

      let allData: AttendanceLog[] = [];
      let from = 0;
      const step = 1000;
      let fetchMore = true;

      while (fetchMore) {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('*, profiles(nik, full_name)')
          .gte('check_in', start)
          .lte('check_in', end)
          .order('check_in', { ascending: true })
          .range(from, from + step - 1);

        if (error) throw error;
        if (recapRequestIdRef.current !== reqId) return;
        
        if (data && data.length > 0) {
          allData = [...allData, ...(data as unknown as AttendanceLog[])];
          if (data.length < step) {
            fetchMore = false;
          } else {
            from += step;
          }
        } else {
          fetchMore = false;
        }
      }
      
      if (recapRequestIdRef.current === reqId) {
        startTransition(() => {
          setRecapLogs(allData);
          setRecapLoading(false);
        });
      }
    } catch (err: unknown) {
      if (recapRequestIdRef.current === reqId) {
        console.error('Error loading monthly recap:', err);
        setRecapLoading(false);
      }
    }
  };

  const loadNotifications = async () => {
    setNotifLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      if (data) setNotifications(data as NotificationRecord[]);
    } catch (err: unknown) {
      console.error('Error loading notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    setLeaveLoading(true);
    try {
      const { data } = await supabase
        .from('leave_requests')
        .select('*, profiles(full_name, nik)')
        .order('created_at', { ascending: false });
      if (data) setLeaveRequests(data as unknown as LeaveRequest[]);
    } catch (err: unknown) {
      console.error('Error loading leave requests:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  const loadAllDashboardData = async () => {
    try {
      // 1. Fetch Geofence and Office settings
      const { data: geoData } = await supabase
        .from('geofence_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (geoData) {
        setGeofence({
          id: geoData.id,
          factory_lat: Number(geoData.factory_lat),
          factory_lon: Number(geoData.factory_lon),
          radius_meters: Number(geoData.radius_meters),
          work_start_time: geoData.work_start_time ? geoData.work_start_time.slice(0, 5) : '08:00',
          work_end_time: geoData.work_end_time ? geoData.work_end_time.slice(0, 5) : '17:00',
          saturday_work_start_time: geoData.saturday_work_start_time ? geoData.saturday_work_start_time.slice(0, 5) : '08:00',
          saturday_work_end_time: geoData.saturday_work_end_time ? geoData.saturday_work_end_time.slice(0, 5) : '12:00',
          break_start_time: geoData.break_start_time ? geoData.break_start_time.slice(0, 5) : '12:00',
          break_end_time: geoData.break_end_time ? geoData.break_end_time.slice(0, 5) : '13:00',
          late_tolerance_minutes: Number(geoData.late_tolerance_minutes || 15),
          overtime_threshold_minutes: Number(geoData.overtime_threshold_minutes ?? 30)
        });
      }

      // 2. Fetch all employee profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      const allEmployees = (profilesData || []) as Profile[];
      setEmployees(allEmployees);

      const totalEmployeesCount = allEmployees.filter(p => p.role === 'user').length;

      // 3. Fetch logs for today (WIB day range query)
      const { start, end } = getTodayRangeWib();

      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select('*, profiles(nik, full_name)')
        .gte('check_in', start)
        .lte('check_in', end)
        .order('check_in', { ascending: false });

      const todayLogs = (logsData || []) as unknown as AttendanceLog[];
      setLogs(todayLogs);

      // 4. Calculate Stats
      const presentIds = new Set(todayLogs.map(l => l.user_id));
      const latesCount = todayLogs.filter(l => l.status === 'Terlambat').length;
      
      setStats({
        totalEmployees: totalEmployeesCount,
        checkedIn: presentIds.size,
        late: latesCount,
        absent: totalEmployeesCount - presentIds.size
      });

      // 4b. Fetch 7 days history for Weekly Chart (WIB)
      const { startIso: sevenStartIso, endIso: sevenEndIso, days: sevenDays } = getLast7DaysWib();

      const { data: weekData } = await supabase
        .from('attendance_logs')
        .select('check_in, user_id')
        .gte('check_in', sevenStartIso)
        .lte('check_in', sevenEndIso);

      const dayUserSets: Record<string, Set<string>> = {};
      sevenDays.forEach(d => {
        dayUserSets[d.key] = new Set();
      });

      if (weekData) {
        weekData.forEach(log => {
          if (!log.check_in) return;
          const logWib = getWibDate(log.check_in);
          const y = logWib.getFullYear();
          const m = String(logWib.getMonth() + 1).padStart(2, '0');
          const d = String(logWib.getDate()).padStart(2, '0');
          const dateKey = `${y}-${m}-${d}`;

          if (dayUserSets[dateKey] && log.user_id) {
            dayUserSets[dateKey].add(log.user_id);
          }
        });
      }

      const weeklyChartData = sevenDays.map(d => ({
        date: d.label,
        hadir: dayUserSets[d.key] ? dayUserSets[d.key].size : 0,
      }));
      setWeeklyStats(weeklyChartData);

      // Fetch recap too
      loadMonthlyRecap(recapMonth, recapYear);

      // 5. Fetch Notifications & Leave Requests
      loadNotifications();
      loadLeaveRequests();

    } catch (err: unknown) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    if (!configured) {
      window.location.href = '/';
      return;
    }

    const checkAdminSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          window.location.href = '/';
          return;
        }

        // Fetch user profile to verify admin role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !profile || profile.role !== 'admin') {
          console.warn('Unauthorized access redirect to employee home.');
          window.location.href = '/';
          return;
        }

        setCurrentUser(session.user);
        setAdminProfile(profile as Profile);

        // Load dashboard data
        await loadAllDashboardData();
      } catch (err: unknown) {
        console.error('Auth check error:', err);
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    checkAdminSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const handleDeleteLeave = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pengajuan ini secara permanen?')) return;
    setLeaveActionLoading(true);
    try {
      const targetReq = leaveRequests.find(r => r.id === id);
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // If deleted request was Approved, clean up its auto-generated attendance logs
      if (targetReq && targetReq.status === 'Approved') {
        const rangeStart = `${targetReq.start_date}T00:00:00+07:00`;
        const rangeEnd = `${targetReq.end_date}T23:59:59.999+07:00`;
        await supabase
          .from('attendance_logs')
          .delete()
          .eq('user_id', targetReq.user_id)
          .gte('check_in', rangeStart)
          .lte('check_in', rangeEnd)
          .ilike('notes', '%Auto-generated by Leave Request%');
        loadMonthlyRecap(recapMonth, recapYear);
      }

      loadLeaveRequests();
    } catch (err: unknown) {
      console.error(err);
      alert('Gagal menghapus data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLeaveActionLoading(false);
    }
  };

  const handleUpdateLeaveStatus = async (request: LeaveRequest, newStatus: 'Approved' | 'Rejected') => {
    setLeaveActionLoading(true);
    try {
      // 1. Update request status
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: newStatus })
        .eq('id', request.id);
      
      if (updateError) throw updateError;

      const rangeStart = `${request.start_date}T00:00:00+07:00`;
      const rangeEnd = `${request.end_date}T23:59:59.999+07:00`;

      // 2. If Approved, auto-insert attendance logs for those days
      if (newStatus === 'Approved') {
        const [startY, startM, startD] = request.start_date.split('-').map(Number);
        const [endY, endM, endD] = request.end_date.split('-').map(Number);
        const curDate = new Date(startY, startM - 1, startD);
        const stopDate = new Date(endY, endM - 1, endD);
        const logsToInsert = [];

        // Loop through each day from start to end
        for (let d = new Date(curDate); d <= stopDate; d.setDate(d.getDate() + 1)) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          
          logsToInsert.push({
            user_id: request.user_id,
            check_in: `${dateStr}T08:00:00+07:00`,
            check_out: `${dateStr}T17:00:00+07:00`,
            status: request.type,
            latitude: geofence.factory_lat || -7.7828,
            longitude: geofence.factory_lon || 110.3608,
            notes: `Auto-generated by Leave Request: ${request.reason}`
          });
        }

        if (logsToInsert.length > 0) {
          // Remove any existing attendance on those dates first to prevent duplicate entries
          await supabase
            .from('attendance_logs')
            .delete()
            .eq('user_id', request.user_id)
            .gte('check_in', rangeStart)
            .lte('check_in', rangeEnd);

          const { error: insertError } = await supabase
            .from('attendance_logs')
            .insert(logsToInsert);
          
          if (insertError) {
            console.error('Error inserting auto logs:', insertError);
            alert('Status diubah tapi gagal membuat log absensi otomatis: ' + insertError.message);
          }
        }
      } else if (newStatus === 'Rejected' && request.status === 'Approved') {
        // Clean up previously auto-generated logs if changing from Approved to Rejected
        await supabase
          .from('attendance_logs')
          .delete()
          .eq('user_id', request.user_id)
          .gte('check_in', rangeStart)
          .lte('check_in', rangeEnd)
          .ilike('notes', '%Auto-generated by Leave Request%');
      }

      loadLeaveRequests();
      // Reload recap if needed
      loadMonthlyRecap(recapMonth, recapYear);
    } catch (err: unknown) {
      console.error(err);
      alert('Terjadi kesalahan saat memproses izin: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLeaveActionLoading(false);
    }
  };

  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotifTitle || !newNotifMessage) return;

    const payload = {
      title: newNotifTitle,
      message: newNotifMessage,
      type: newNotifType,
      target_user_id: newNotifTarget || null,
      is_active: true
    };

    const { error } = await supabase.from('notifications').insert([payload]);
    if (error) {
      setNotifFeedback({ success: false, message: 'Gagal membuat notifikasi.' });
    } else {
      setNotifFeedback({ success: true, message: 'Notifikasi berhasil dibuat!' });
      setNewNotifTitle('');
      setNewNotifMessage('');
      setNewNotifTarget('');
      loadNotifications();
    }
    setTimeout(() => setNotifFeedback(null), 3000);
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Hapus notifikasi ini?')) return;
    await supabase.from('notifications').delete().eq('id', id);
    loadNotifications();
  };

  // Sign out admin
  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Update Geofence & Office Hour Settings
  const handleUpdateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeofenceLoading(true);
    setGeofenceMessage('');

    try {
      const { error } = await supabase
        .from('geofence_settings')
        .upsert({
          id: 1,
          factory_lat: Number(geofence.factory_lat),
          factory_lon: Number(geofence.factory_lon),
          radius_meters: Number(geofence.radius_meters),
          work_start_time: geofence.work_start_time,
          work_end_time: geofence.work_end_time,
          saturday_work_start_time: geofence.saturday_work_start_time,
          saturday_work_end_time: geofence.saturday_work_end_time,
          break_start_time: geofence.break_start_time,
          break_end_time: geofence.break_end_time,
          late_tolerance_minutes: Number(geofence.late_tolerance_minutes),
          overtime_threshold_minutes: Number(geofence.overtime_threshold_minutes),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setGeofenceMessage('Pengaturan kantor dan jam kerja berhasil diperbarui!');
      loadAllDashboardData();
    } catch (err: unknown) {
      setGeofenceMessage(`Gagal memperbarui: ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setGeofenceLoading(false);
    }
  };

  // Save Employee (Create or Edit)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNik.trim() || !newFullName.trim() || !newPasscode.trim()) {
      setRegFeedback({ success: false, message: 'Harap lengkapi semua form.' });
      return;
    }

    if (newPasscode.trim().length !== 6 || isNaN(Number(newPasscode))) {
      setRegFeedback({ success: false, message: 'Passcode harus terdiri dari 6 angka.' });
      return;
    }

    setRegLoading(true);
    setRegFeedback(null);

    try {
      if (editingEmployee) {
        // Edit Mode: Update existing employee profile and auth password
        const { data, error } = await supabase.rpc('admin_update_user', {
          p_user_id: editingEmployee.id,
          p_nik: newNik.trim(),
          p_full_name: newFullName.trim(),
          p_role: newRole,
          p_passcode: newPasscode.trim()
        });

        if (error) throw error;

        const res = data as { success: boolean; message: string };
        if (!res.success) {
          throw new Error(res.message);
        }

        setRegFeedback({
          success: true,
          message: `Berhasil memperbarui data karyawan ${newFullName.trim()}.`
        });

        // Exit edit mode and reload lists
        handleCancelEdit();
        await loadAllDashboardData();
      } else {
        // Create Mode: Register new employee using direct SQL insert (bypasses auth rate limits!)
        const { data, error } = await supabase.rpc('admin_create_user', {
          p_nik: newNik.trim(),
          p_full_name: newFullName.trim(),
          p_role: newRole,
          p_passcode: newPasscode.trim()
        });

        if (error) throw error;

        const res = data as { success: boolean; message: string; id?: string };
        if (!res.success) {
          throw new Error(res.message);
        }

        setRegFeedback({
          success: true,
          message: `Berhasil! Karyawan ${newFullName.trim()} (NIK: ${newNik.trim()}) telah didaftarkan.`
        });
        
        // Clear fields
        setNewNik('');
        setNewFullName('');
        setNewPasscode('');
        setNewRole('user');

        // Reload lists
        await loadAllDashboardData();
      }
    } catch (err: unknown) {
      console.error('Save employee error:', err);
      setRegFeedback({
        success: false,
        message: (err instanceof Error ? err.message : String(err)) || `Gagal memproses data karyawan.`
      });
    } finally {
      setRegLoading(false);
    }
  };

  // Import Employees from Excel file
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be imported again if needed
    e.target.value = '';

    setImportLoading(true);
    setImportFeedback(null);
    setImportProgress({ current: 0, total: 0 });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to array of arrays
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number | undefined)[][];
        if (rows.length <= 1) {
          throw new Error('File Excel kosong atau hanya berisi header.');
        }

        const headers = rows[0] || [];
        const namaIdx = headers.findIndex(h => h && h.toString().toUpperCase().trim().includes('NAMA'));
        const nikIdx = headers.findIndex(h => h && h.toString().toUpperCase().trim().includes('NIK'));
        const roleIdx = headers.findIndex(h => h && (h.toString().toUpperCase().trim().includes('ROLE') || h.toString().toUpperCase().trim().includes('JABATAN')));
        const tglIdx = headers.findIndex(h => h && (h.toString().toUpperCase().trim().includes('TGL') || h.toString().toUpperCase().trim().includes('DAFTAR')));

        if (namaIdx === -1 || nikIdx === -1) {
          throw new Error('Kolom NAMA KARYAWAN dan NIK wajib ada dalam file Excel.');
        }

        // Filter valid data rows (must have NIK and Name)
        const validRows = rows.slice(1).filter(row => {
          const name = row[namaIdx]?.toString().trim();
          const nik = row[nikIdx]?.toString().trim();
          return name && nik;
        });

        if (validRows.length === 0) {
          throw new Error('Tidak ditemukan data karyawan yang valid (Nama dan NIK tidak boleh kosong).');
        }

        setImportProgress({ current: 0, total: validRows.length });

        const userPayloads = validRows.map(row => {
          const name = (row[namaIdx] ?? '').toString().trim();
          const nikVal = (row[nikIdx] ?? '').toString().trim();
          const roleRaw = roleIdx !== -1 ? (row[roleIdx] ?? '').toString().trim() : '';
          const roleVal = roleRaw.toUpperCase() === 'ADMIN' ? 'admin' : 'user';

          let tglDaftarVal = new Date();
          if (tglIdx !== -1 && row[tglIdx]) {
            const rawDate = row[tglIdx];
            const parsed = Date.parse(String(rawDate).trim());
            if (!isNaN(parsed)) tglDaftarVal = new Date(parsed);
          }

          return {
            nik: nikVal,
            full_name: name,
            role: roleVal,
            passcode: '123456',
            created_at: tglDaftarVal.toISOString()
          };
        });

        // Fast Batch Import (High Speed)
        try {
          const { data: batchData, error: batchError } = await supabase.rpc('admin_create_users_batch', {
            p_users: userPayloads
          });

          if (!batchError && batchData && batchData.success) {
            setImportFeedback({
              success: true,
              message: `Import Selesai! Berhasil: ${batchData.success_count} karyawan. Gagal/Sudah Ada: ${batchData.fail_count} karyawan. (Passcode default: 123456)`
            });
            await loadAllDashboardData();
            return;
          }
        } catch {
          // Fallback to sequential if batch RPC is not yet created in user's DB
        }

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < userPayloads.length; i++) {
          const emp = userPayloads[i];
          try {
            const { data, error } = await supabase.rpc('admin_create_user', {
              p_nik: emp.nik,
              p_full_name: emp.full_name,
              p_role: emp.role,
              p_passcode: emp.passcode,
              p_created_at: emp.created_at
            });

            if (error) throw error;
            const res = data as { success: boolean; message: string };
            if (!res.success) throw new Error(res.message);

            successCount++;
          } catch (err) {
            console.error(`Gagal mendaftarkan NIK ${emp.nik}:`, err);
            errorCount++;
          }

          setImportProgress({ current: i + 1, total: userPayloads.length });
        }

        setImportFeedback({
          success: true,
          message: `Import Selesai! Berhasil: ${successCount} karyawan. Gagal/Sudah Ada: ${errorCount} karyawan. (Passcode default: 123456)`
        });

        // Reload lists
        await loadAllDashboardData();

      } catch (err: unknown) {
        setImportFeedback({
          success: false,
          message: (err instanceof Error ? err.message : String(err)) || 'Gagal membaca atau memproses file Excel.'
        });
      } finally {
        setImportLoading(false);
        setImportProgress(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Delete Employee Confirmation Action
  const handleDeleteEmployeeConfirm = async () => {
    if (!employeeToDelete) return;
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        p_user_id: employeeToDelete.id
      });

      if (error) throw error;

      const res = data as { success: boolean; message: string };
      if (!res.success) {
        throw new Error(res.message);
      }

      setRegFeedback({
        success: true,
        message: `Berhasil menghapus karyawan ${employeeToDelete.full_name}.`
      });

      // Reload dashboard
      await loadAllDashboardData();
    } catch (err: unknown) {
      console.error(err);
      setRegFeedback({
        success: false,
        message: (err instanceof Error ? err.message : String(err)) || 'Gagal menghapus karyawan.'
      });
    } finally {
      setEmployeeToDelete(null);
    }
  };

  // Reset All Employees (delete all users with role 'user')
  const handleResetAllEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_reset_all_users');
      if (error) throw error;
      const res = data as { success: boolean; message: string };
      if (!res.success) throw new Error(res.message);

      setRegFeedback({
        success: true,
        message: res.message
      });

      // Reload dashboard
      await loadAllDashboardData();
      setShowResetModal(false);
    } catch (err: unknown) {
      console.error(err);
      setRegFeedback({
        success: false,
        message: (err instanceof Error ? err.message : String(err)) || 'Gagal mereset data karyawan.'
      });
      setShowResetModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Open modal to add or edit attendance
  const handleEditCellClick = (employee: Profile, day: number, log?: AttendanceLog) => {
    setEditingCell({ employee, day, log });
    
    if (log) {
      const inDate = getWibDate(log.check_in);
      const inHrs = String(inDate.getHours()).padStart(2, '0');
      const inMins = String(inDate.getMinutes()).padStart(2, '0');
      setEditCheckIn(`${inHrs}:${inMins}`);

      if (log.check_out) {
        const outDate = getWibDate(log.check_out);
        const outHrs = String(outDate.getHours()).padStart(2, '0');
        const outMins = String(outDate.getMinutes()).padStart(2, '0');
        setEditCheckOut(`${outHrs}:${outMins}`);
      } else {
        setEditCheckOut('');
      }
      setEditStatus(log.status || 'Tepat Waktu');
    } else {
      setEditCheckIn('08:00');
      setEditCheckOut('17:00');
      setEditStatus('Tepat Waktu');
    }
  };

  // Save manual attendance correction
  const handleSaveAttendanceEdit = async () => {
    if (!editingCell) return;
    setIsSavingEdit(true);

    const { employee, day, log } = editingCell;
    const year = recapYear;
    const month = recapMonth;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const checkInTimestamp = `${dateStr}T${editCheckIn}:00+07:00`;
    const checkOutTimestamp = editCheckOut ? `${dateStr}T${editCheckOut}:00+07:00` : null;

    try {
      if (log) {
        const { data, error } = await supabase
          .from('attendance_logs')
          .update({
            check_in: checkInTimestamp,
            check_out: checkOutTimestamp,
            status: editStatus
          })
          .eq('id', log.id)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Update ditolak oleh sistem (kemungkinan masalah hak akses/RLS database).');
        }
      } else {
        const { error } = await supabase
          .from('attendance_logs')
          .insert({
            user_id: employee.id,
            check_in: checkInTimestamp,
            check_out: checkOutTimestamp,
            status: editStatus,
            latitude: geofence.factory_lat || -7.7828,
            longitude: geofence.factory_lon || 110.3608
          });

        if (error) throw error;
      }

      await loadMonthlyRecap(recapMonth, recapYear);
      setEditingCell(null);
    } catch (err: unknown) {
      console.error('Error saving attendance edit:', err);
      alert('Gagal menyimpan perubahan absensi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete attendance record
  const handleDeleteAttendanceRecord = async () => {
    if (!editingCell?.log) return;
    if (!confirm('Apakah Anda yakin ingin menghapus catatan absensi ini?')) return;
    setIsSavingEdit(true);

    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('id', editingCell.log.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Hapus ditolak oleh sistem (kemungkinan masalah hak akses/RLS database).');
      }

      await loadMonthlyRecap(recapMonth, recapYear);
      setEditingCell(null);
    } catch (err: unknown) {
      console.error('Error deleting attendance record:', err);
      alert('Gagal menghapus absensi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Populate fields for edit mode
  const handleStartEdit = (emp: Profile) => {
    setEditingEmployee(emp);
    setNewNik(emp.nik);
    setNewFullName(emp.full_name);
    setNewPasscode(emp.passcode || '123456');
    setNewRole(emp.role);
    setRegFeedback(null);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setNewNik('');
    setNewFullName('');
    setNewPasscode('');
    setNewRole('user');
    setRegFeedback(null);
  };

  // Toggle passcode show/hide state
  const togglePasscodeVisibility = (id: string) => {
    setVisiblePasscodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Export Attendance Log to CSV file
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('Tidak ada log presensi hari ini untuk diekspor.');
      return;
    }

    const headers = ['Nama', 'NIK', 'Jam Masuk', 'Jam Pulang', 'Status', 'Latitude', 'Longitude'];
    const rows = logs.map(log => [
      log.profiles?.full_name || '-',
      log.profiles?.nik || '-',
      log.check_in ? new Date(log.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      log.check_out ? new Date(log.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      log.status,
      log.latitude,
      log.longitude
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_presensi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to calculate tardiness in minutes based on work start time
  const getMinutesLate = (checkInStr: string, workStartStr: string) => {
    if (!checkInStr) return 0;
    try {
      const checkInDate = new Date(checkInStr);
      // Convert check-in time to local WIB time (GMT+7)
      const wibCheckIn = new Date(checkInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const checkInHrs = wibCheckIn.getHours();
      const checkInMins = wibCheckIn.getMinutes();

      // Check if Saturday (6)
      const dayOfWeek = wibCheckIn.getDay();
      const targetStartStr = (dayOfWeek === 6 && geofence?.saturday_work_start_time)
        ? geofence.saturday_work_start_time
        : workStartStr;

      const [startHrs, startMins] = targetStartStr.split(':').map(Number);
      const checkInTotalMins = checkInHrs * 60 + checkInMins;
      const startTotalMins = startHrs * 60 + (startMins || 0);

      const diff = checkInTotalMins - startTotalMins;
      return diff > 0 ? diff : 0;
    } catch (err) {
      console.error(err);
      return 0;
    }
  };

  // Helper to format tardiness in minutes for visual display
  const formatLateMinutes = (mins: number) => {
    if (mins <= 0) return '0 Menit';
    if (mins < 60) return `${mins} Menit`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${mins} Menit (${hrs} Jam)`;
    return `${mins} Menit (${hrs}j ${remainingMins}m)`;
  };

  // Helper to calculate overtime minutes: minutes worked past work_end_time + threshold
  // Only counts as overtime if employee stays MORE than overtime_threshold_minutes past end time.
  // Returns the TOTAL extra minutes (including the threshold portion) once threshold is exceeded.
  const getOvertimeMinutes = (checkOutStr: string | null, workEndStr: string) => {
    if (!checkOutStr) return 0;
    try {
      const checkOutDate = new Date(checkOutStr);
      const wibCheckOut = new Date(checkOutDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const checkOutHrs = wibCheckOut.getHours();
      const checkOutMins = wibCheckOut.getMinutes();

      // Use Saturday end time if applicable
      const dayOfWeek = wibCheckOut.getDay();
      const targetEndStr = (dayOfWeek === 6 && geofence?.saturday_work_end_time)
        ? geofence.saturday_work_end_time
        : workEndStr;

      const [endHrs, endMins] = targetEndStr.split(':').map(Number);
      const checkOutTotalMins = checkOutHrs * 60 + checkOutMins;
      const endTotalMins = endHrs * 60 + (endMins || 0);
      const threshold = geofence?.overtime_threshold_minutes ?? 30;

      const diff = checkOutTotalMins - endTotalMins;
      // Only count as overtime if the employee stayed past the threshold
      return diff > threshold ? diff : 0;
    } catch (err) {
      console.error(err);
      return 0;
    }
  };

  // Helper to format overtime minutes for display
  const formatOvertimeMinutes = (mins: number) => {
    if (mins <= 0) return '0 Jam';
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs === 0) return `${remainingMins} Menit`;
    if (remainingMins === 0) return `${hrs} Jam`;
    return `${hrs}j ${remainingMins}m`;
  };

  // Memoized: filter and sort employee list
  const processedEmployees = useMemo(() => {
    let list = employees;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(emp =>
        emp.full_name.toLowerCase().includes(term) ||
        emp.nik.toLowerCase().includes(term)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'excel') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name, 'id');
      if (sortBy === 'nik') return a.nik.localeCompare(b.nik, undefined, { numeric: true });
      return 0;
    });
  }, [employees, searchTerm, sortBy]);

  // Memoized: O(1) lookup map: "userId_day" -> AttendanceLog
  // Avoids O(n²) recapLogs.find() inside the render loop
  const recapLogMap = useMemo(() => {
    const map = new Map<string, typeof recapLogs[0]>();
    for (const log of recapLogs) {
      const d = getWibDate(log.check_in);
      if (d.getFullYear() === recapYear && d.getMonth() === recapMonth) {
        map.set(`${log.user_id}_${d.getDate()}`, log);
      }
    }
    return map;
  }, [recapLogs, recapYear, recapMonth]);

  // Memoized: pre-computed per-employee recap stats (respects the custom date range)
  const employeeRecapStats = useMemo(() => {
    const statsMap = new Map<string, {
      presentDays: typeof recapLogs;
      countInRange: number;
      countTotal: number;
      totalLateMinutes: number;
      totalOvertimeMinutes: number;
    }>();
    for (const emp of processedEmployees) {
      if (emp.role !== 'user') continue;
      const isWorkingAttendance = (status?: string) => {
        return status ? !['Izin', 'Sakit', 'Cuti', 'Alpa'].includes(status) : false;
      };
      const presentDays = recapLogs.filter(l => l.user_id === emp.id && isWorkingAttendance(l.status));
      // Count attendance within the custom date range
      const inRange = presentDays.filter(l => {
        const d = getWibDate(l.check_in).getDate();
        return d >= recapStartDay && d <= recapEndDay;
      });
      const totalLateMinutes = inRange.reduce((acc, log) => {
        return log.status === 'Terlambat'
          ? acc + getMinutesLate(log.check_in, geofence.work_start_time)
          : acc;
      }, 0);
      const totalOvertimeMinutes = inRange.reduce((acc, log) => acc + getOvertimeMinutes(log.check_out, geofence.work_end_time), 0);
      statsMap.set(emp.id, {
        presentDays,
        countInRange: inRange.length,
        countTotal: presentDays.length,
        totalLateMinutes,
        totalOvertimeMinutes,
      });
    }
    return statsMap;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recapLogs, processedEmployees, geofence.work_start_time, geofence.work_end_time, recapStartDay, recapEndDay]);

  // Memoized: days array for the selected month (filtered to the chosen range)
  const daysInSelectedMonth = useMemo(
    () => {
      const totalDays = new Date(recapYear, recapMonth + 1, 0).getDate();
      const clampedEnd = Math.min(recapEndDay, totalDays);
      const clampedStart = Math.max(recapStartDay, 1);
      return Array.from(
        { length: Math.max(0, clampedEnd - clampedStart + 1) },
        (_, i) => clampedStart + i
      );
    },
    [recapYear, recapMonth, recapStartDay, recapEndDay]
  );

  // Memoized: Sunday lookup for the selected month
  const sundaySet = useMemo(() => {
    const s = new Set<number>();
    for (const day of daysInSelectedMonth) {
      if (new Date(recapYear, recapMonth, day).getDay() === 0) s.add(day);
    }
    return s;
  }, [daysInSelectedMonth, recapYear, recapMonth]);

  // Handlers for month/year changes with automatic re-fetch
  const handleRecapMonthChange = (newMonth: number) => {
    startTransition(() => {
      setRecapMonth(newMonth);
      const lastDay = new Date(recapYear, newMonth + 1, 0).getDate();
      setRecapStartDay(1);
      setRecapEndDay(lastDay);
    });
    loadMonthlyRecap(newMonth, recapYear);
  };

  const handleRecapYearChange = (newYear: number) => {
    startTransition(() => {
      setRecapYear(newYear);
      const lastDay = new Date(newYear, recapMonth + 1, 0).getDate();
      setRecapStartDay(1);
      setRecapEndDay(lastDay);
    });
    loadMonthlyRecap(recapMonth, newYear);
  };

  // Export Monthly Recap Grid to XLSX file (optimized O(1) non-blocking)
  const handleExportRecapXLSX = () => {
    const activeEmployees = processedEmployees.filter(p => p.role === 'user');
    if (activeEmployees.length === 0) {
      alert('Tidak ada data karyawan untuk diekspor.');
      return;
    }

    setExportRecapLoading(true);

    setTimeout(() => {
      try {
        const totalDaysInMonth = new Date(recapYear, recapMonth + 1, 0).getDate();
        const clampedStart = Math.max(recapStartDay, 1);
        const clampedEnd = Math.min(recapEndDay, totalDaysInMonth);
        const exportDays = Array.from(
          { length: Math.max(0, clampedEnd - clampedStart + 1) },
          (_, i) => clampedStart + i
        );

        // O(1) instant lookup from pre-computed memoized stats & map
        const dataRows = activeEmployees.map((emp, rowIdx) => {
          const stats = employeeRecapStats.get(emp.id) || {
            countInRange: 0,
            countTotal: 0,
            totalLateMinutes: 0,
            totalOvertimeMinutes: 0,
          };

          const dailyStatus = exportDays.map(day => {
            const log = recapLogMap.get(`${emp.id}_${day}`);
            if (log) {
              const isLeave = ['Izin', 'Sakit', 'Cuti'].includes(log.status);
              const timeInStr = formatWibTime(log.check_in);
              const timeOutStr = log.check_out
                ? formatWibTime(log.check_out)
                : isLeave
                ? '--:--'
                : 'Belum Pulang';
              return `${log.status} (${timeInStr} → ${timeOutStr})`;
            }
            return sundaySet.has(day) ? 'Libur' : '—';
          });

          return {
            no: rowIdx + 1,
            nama: emp.full_name,
            nik: emp.nik,
            countInRange: stats.countInRange,
            total: stats.countTotal,
            terlambat: formatLateMinutes(stats.totalLateMinutes),
            lembur: formatOvertimeMinutes(stats.totalOvertimeMinutes),
            daily: dailyStatus,
          };
        });

        // ── Build worksheet data (array-of-arrays) ───────────────────────────────
        const titleRow = [`REKAP BULANAN KEHADIRAN KARYAWAN — ${INDONESIAN_MONTHS[recapMonth].toUpperCase()} ${recapYear} (Tgl ${clampedStart}–${clampedEnd})`];
        const blankRow: string[] = [];
        const dateHeaders = exportDays.map(d => `${d}`);
        const headerRow = [
          'No',
          'Nama Karyawan',
          'NIK',
          `Hadir (${clampedStart}–${clampedEnd})`,
          'Total Hadir',
          'Terlambat',
          'Lembur',
          ...dateHeaders,
        ];

        const bodyRows = dataRows.map(r => [
          r.no,
          r.nama,
          r.nik,
          r.countInRange,
          r.total,
          r.terlambat,
          r.lembur,
          ...r.daily,
        ]);

        const aoa = [titleRow, blankRow, headerRow, ...bodyRows];

        // ── Create workbook & sheet ───────────────────────────────────────────────
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        const totalCols = 7 + exportDays.length;

        // Column widths
        ws['!cols'] = [
          { wch: 5 },   // No
          { wch: 28 },  // Nama
          { wch: 14 },  // NIK
          { wch: 14 },  // Hadir (range)
          { wch: 12 },  // Total
          { wch: 14 },  // Terlambat
          { wch: 14 },  // Lembur
          ...Array(exportDays.length).fill({ wch: 16 }),
        ];

        // Row heights
        ws['!rows'] = [
          { hpt: 24 }, // title row
          { hpt: 6 },  // blank
          { hpt: 26 }, // header
          ...Array(dataRows.length).fill({ hpt: 20 }),
        ];

        // Merge title across all columns
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        ];

        // Freeze panes: freeze first 3 cols & top 3 rows
        ws['!freeze'] = { xSplit: 3, ySplit: 3 };

        // ── Export ───────────────────────────────────────────────────────────────
        const sheetName = `Rekap ${INDONESIAN_MONTHS[recapMonth]} ${recapYear}`;
        const fileName = `rekap_bulanan_${INDONESIAN_MONTHS[recapMonth]}_${recapYear}_tgl${clampedStart}-${clampedEnd}.xlsx`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, fileName);
      } catch (err: unknown) {
        console.error('Export error:', err);
        alert('Gagal mengekspor file: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setExportRecapLoading(false);
      }
    }, 50);
  };

  // Reset / hapus semua log absensi pada bulan & tahun yang dipilih
  const handleResetMonthlyRecap = async () => {
    setResetRecapLoading(true);
    try {
      const { start, end } = getMonthRangeWib(recapYear, recapMonth);

      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .gte('check_in', start)
        .lte('check_in', end);

      if (error) throw error;

      await loadMonthlyRecap(recapMonth, recapYear);
      setShowResetRecapModal(false);
    } catch (err: unknown) {
      console.error('Error resetting recap:', err);
      alert('Gagal mereset data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setResetRecapLoading(false);
    }
  };

  // ── PAYSLIP FUNCTIONS ─────────────────────────────────────────────────────

  const loadPayslipList = async () => {
    setPayslipLoading(true);
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('period_month, period_year, period_label, uploaded_at')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .order('period_label', { ascending: true });
      if (error) throw error;
      const grouped: Record<string, { period_month: number; period_year: number; period_label: string; count: number; uploaded_at: string }> = {};
      for (const row of (data || [])) {
        const key = `${row.period_year}_${row.period_month}_${row.period_label}`;
        if (!grouped[key]) grouped[key] = { period_month: row.period_month, period_year: row.period_year, period_label: row.period_label, count: 0, uploaded_at: row.uploaded_at };
        grouped[key].count++;
      }
      setPayslipList(Object.values(grouped));
    } catch (err) {
      console.error('Error loading payslip list:', err);
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleImportPayslipExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPayslipImportLoading(true);
    setPayslipFeedback(null);
    setPayslipImportProgress(null);
    const iMonths = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames.find((n: string) => n.toUpperCase().includes('LAPORAN GAJI')) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          if (rows[i].some((c: unknown) => String(c ?? '').toUpperCase().trim() === 'NIK')) { headerRowIdx = i; break; }
        }
        if (headerRowIdx === -1) throw new Error('Header NIK tidak ditemukan di file Excel.');
        const headers: string[] = rows[headerRowIdx].map((h: unknown) => String(h ?? '').trim());
        const nikIdx = headers.findIndex(h => h.toUpperCase() === 'NIK');
        if (nikIdx === -1) throw new Error('Kolom NIK tidak ditemukan.');
        const dataRows = rows.slice(headerRowIdx + 1).filter(row => row[nikIdx] !== null && row[nikIdx] !== undefined && row[nikIdx] !== '');
        if (dataRows.length === 0) throw new Error('Tidak ada data karyawan di file.');
        setPayslipImportProgress({ current: 0, total: dataRows.length });
        const colMap: Record<string, number> = {};
        headers.forEach((h, i) => { if (h) colMap[h] = i; });
        const getVal = (row: unknown[], key: string): unknown => { const idx = colMap[key]; return idx !== undefined ? (row[idx] ?? null) : null; };
        const { data: allProfiles } = await supabase.from('profiles').select('id, nik').eq('role', 'user');
        const profileMap = new Map<string, string>();
        for (const p of (allProfiles || [])) profileMap.set(String(p.nik).trim(), p.id);
        const { data: { session } } = await supabase.auth.getSession();
        const adminId = session?.user?.id;
        let successCount = 0, notFoundCount = 0, errorCount = 0;
        const notFoundNiks: string[] = [];
        const recordsToUpsert: Array<{
          user_id: string;
          nik: string;
          period_month: number;
          period_year: number;
          period_label: string;
          data: Record<string, unknown>;
          uploaded_by?: string;
        }> = [];
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const nik = String(row[nikIdx]).trim();
          const userId = profileMap.get(nik);
          if (!userId) { 
            notFoundCount++; 
            notFoundNiks.push(nik); 
            continue; 
          }
          const rowData: Record<string, unknown> = {
            no_urut: getVal(row, 'No. Urut'), nama: getVal(row, 'Nama'), jabatan: getVal(row, 'Jabatan'),
            gaji_pokok: getVal(row, 'Gaji Pokok'), upah_per_hari: getVal(row, 'Upah /Hari'), total_masuk: getVal(row, 'Total Masuk'),
            total_gaji_a: getVal(row, 'Total Gaji A'), premi: getVal(row, 'Premi'), tunjangan: getVal(row, 'Tunjangan'),
            total_lembur_jam: getVal(row, 'Total Lembur (jam)'), upah_lembur_per_jam: getVal(row, 'Upah Lembur /Jam'), gaji_lembur: getVal(row, 'Gaji Lembur'),
            upah_borongan: getVal(row, 'Upah Borongan'), over_target: getVal(row, 'Over Target'), total_gaji_b: getVal(row, 'Total Gaji B'),
            potongan_masuk_jam: getVal(row, 'Potongan Masuk (jam)'), potongan: getVal(row, 'Potongan'),
            potongan_lain_lain: getVal(row, 'Potongan (Lain - lain)'), lain_lain: getVal(row, 'Lain - Lain'),
            total_gaji_bersih: getVal(row, 'Total Gaji Bersih'),
            no_rekening: getVal(row, 'No Rekening') !== null ? String(getVal(row, 'No Rekening')) : null,
            no_whatsapp: getVal(row, 'No WhatsApp') !== null ? String(getVal(row, 'No WhatsApp')) : null,
          };
          recordsToUpsert.push({
            user_id: userId,
            nik,
            period_month: payslipMonth + 1,
            period_year: payslipYear,
            period_label: payslipLabel,
            data: rowData,
            uploaded_by: adminId
          });
          setPayslipImportProgress({ current: i + 1, total: dataRows.length });
        }

        if (recordsToUpsert.length > 0) {
          try {
            const { error } = await supabase.from('payslips').upsert(
              recordsToUpsert,
              { onConflict: 'user_id,period_month,period_year,period_label' }
            );
            if (error) throw error;
            successCount = recordsToUpsert.length;
          } catch (err: unknown) {
            console.error('Batch payslip upsert error:', err);
            errorCount = recordsToUpsert.length;
          }
        }
        const notFoundMsg = notFoundNiks.length > 0 ? ` NIK tidak terdaftar: ${notFoundNiks.slice(0, 5).join(', ')}${notFoundNiks.length > 5 ? ` +${notFoundNiks.length - 5} lainnya` : ''}.` : '';
        setPayslipFeedback({ success: errorCount === 0, message: `Import ${iMonths[payslipMonth]} ${payslipYear} (${payslipLabel}) selesai! ✅ Berhasil: ${successCount} | ❌ Error: ${errorCount} | ⚠️ NIK tidak ditemukan: ${notFoundCount}.${notFoundMsg}` });
        await loadPayslipList();
      } catch (err: unknown) {
        setPayslipFeedback({ success: false, message: (err instanceof Error ? err.message : String(err)) || 'Gagal memproses file Excel.' });
      } finally { setPayslipImportLoading(false); setPayslipImportProgress(null); }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeletePeriodPayslips = async (month: number, year: number, label: string) => {
    setDeletingPeriod(null);
    try {
      const { error } = await supabase.from('payslips').delete().eq('period_month', month).eq('period_year', year).eq('period_label', label);
      if (error) throw error;
      await loadPayslipList();
      const mNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
      setPayslipFeedback({ success: true, message: `Slip gaji ${mNames[month - 1]} ${year} (${label}) berhasil dihapus.` });
    } catch (err: unknown) {
      setPayslipFeedback({ success: false, message: 'Gagal menghapus: ' + (err instanceof Error ? err.message : String(err)) });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-5 shadow-lg shadow-orange-500/10"></div>
          <p className="text-slate-800 font-extrabold text-xl tracking-wide">Memuat Panel Admin...</p>


        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 font-sans antialiased text-gray-800 flex min-h-screen">
      {/* SIDEBAR */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'recap') {
            startTransition(() => {
              setActiveTab('recap');
            });
            loadMonthlyRecap(recapMonth, recapYear);
          } else {
            setActiveTab(tab);
          }
          if (tab === 'payslip') loadPayslipList();
          if (tab === 'notifications') loadNotifications();
          if (tab === 'leave') loadLeaveRequests();
        }}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onCloseMobileSidebar={closeMobileSidebar}
        adminProfile={adminProfile}
        onLogoutClick={() => setShowLogoutModal(true)}
      />

      {/* AREA UTAMA (KANAN) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-auto h-screen">
        {/* TOPBAR */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition cursor-pointer"
              aria-label="Buka Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h2 className="text-base md:text-xl font-extrabold text-gray-800 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard Monitor'}
              {activeTab === 'employees' && 'Kelola Karyawan'}
              {activeTab === 'recap' && 'Rekap Bulanan'}
              {activeTab === 'geofencing' && 'Pengaturan Kantor'}
              {activeTab === 'payslip' && 'Kelola Slip Gaji'}
              {activeTab === 'notifications' && 'Kelola Notifikasi'}
              {activeTab === 'leave' && 'Kelola Cuti & Izin'}
            </h2>
          </div>
          <div className="text-xs md:text-sm font-bold text-gray-500 bg-gray-50 border px-3 md:px-4 py-2 rounded-xl shrink-0">
            {dateString}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <DashboardOverview
            stats={stats}
            weeklyStats={weeklyStats}
            logs={logs}
            geofence={geofence}
            getOvertimeMinutes={getOvertimeMinutes}
            formatOvertimeMinutes={formatOvertimeMinutes}
            onExportCSV={handleExportCSV}
            onNavigateToGeofence={() => setActiveTab('geofencing')}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeManager
            processedEmployees={processedEmployees}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            visiblePasscodes={visiblePasscodes}
            togglePasscodeVisibility={togglePasscodeVisibility}
            currentUser={currentUser}
            onStartEdit={handleStartEdit}
            onDeleteEmployee={(emp) => setEmployeeToDelete(emp)}
            onShowResetModal={() => setShowResetModal(true)}
            onImportExcel={handleImportExcel}
            importLoading={importLoading}
            importProgress={importProgress}
            importFeedback={importFeedback}
            onDismissImportFeedback={() => setImportFeedback(null)}
            editingEmployee={editingEmployee}
            newNik={newNik}
            setNewNik={setNewNik}
            newFullName={newFullName}
            setNewFullName={setNewFullName}
            newPasscode={newPasscode}
            setNewPasscode={setNewPasscode}
            newRole={newRole}
            setNewRole={setNewRole}
            regLoading={regLoading}
            regFeedback={regFeedback}
            onSaveEmployee={handleSaveEmployee}
            onCancelEdit={handleCancelEdit}
          />
        )}

        {activeTab === 'recap' && (
          <MonthlyRecapGrid
            recapMonth={recapMonth}
            onMonthChange={handleRecapMonthChange}
            recapYear={recapYear}
            onYearChange={handleRecapYearChange}
            recapStartDay={recapStartDay}
            setRecapStartDay={setRecapStartDay}
            recapEndDay={recapEndDay}
            setRecapEndDay={setRecapEndDay}
            onRefreshRecap={() => loadMonthlyRecap(recapMonth, recapYear)}
            onExportRecapXLSX={handleExportRecapXLSX}
            exportRecapLoading={exportRecapLoading}
            onOpenResetRecapModal={() => setShowResetRecapModal(true)}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            recapLoading={recapLoading}
            isPending={isPending}
            daysInSelectedMonth={daysInSelectedMonth}
            processedEmployees={processedEmployees}
            employeeRecapStats={employeeRecapStats}
            recapLogMap={recapLogMap}
            sundaySet={sundaySet}
            formatLateMinutes={formatLateMinutes}
            formatOvertimeMinutes={formatOvertimeMinutes}
            onEditCellClick={handleEditCellClick}
            showResetRecapModal={showResetRecapModal}
            setShowResetRecapModal={setShowResetRecapModal}
            resetRecapLoading={resetRecapLoading}
            onResetMonthlyRecap={handleResetMonthlyRecap}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            editCheckIn={editCheckIn}
            setEditCheckIn={setEditCheckIn}
            editCheckOut={editCheckOut}
            setEditCheckOut={setEditCheckOut}
            editStatus={editStatus}
            setEditStatus={setEditStatus}
            isSavingEdit={isSavingEdit}
            onSaveAttendanceEdit={handleSaveAttendanceEdit}
            onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
          />
        )}

        {activeTab === 'geofencing' && (
          <GeofenceSettingsCard
            geofence={geofence}
            setGeofence={setGeofence}
            geofenceLoading={geofenceLoading}
            geofenceMessage={geofenceMessage}
            onUpdateGeofence={handleUpdateGeofence}
          />
        )}

        {activeTab === 'payslip' && (
          <PayslipManager
            payslipFeedback={payslipFeedback}
            payslipMonth={payslipMonth}
            setPayslipMonth={setPayslipMonth}
            payslipYear={payslipYear}
            setPayslipYear={setPayslipYear}
            payslipLabel={payslipLabel}
            setPayslipLabel={setPayslipLabel}
            payslipImportLoading={payslipImportLoading}
            onImportPayslipExcel={handleImportPayslipExcel}
            payslipImportProgress={payslipImportProgress}
            payslipLoading={payslipLoading}
            payslipList={payslipList}
            onRefreshPayslips={loadPayslipList}
            deletingPeriod={deletingPeriod}
            setDeletingPeriod={setDeletingPeriod}
            onDeletePeriodPayslips={handleDeletePeriodPayslips}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationManager
            notifFeedback={notifFeedback}
            newNotifTitle={newNotifTitle}
            setNewNotifTitle={setNewNotifTitle}
            newNotifType={newNotifType}
            setNewNotifType={setNewNotifType}
            newNotifMessage={newNotifMessage}
            setNewNotifMessage={setNewNotifMessage}
            newNotifTarget={newNotifTarget}
            setNewNotifTarget={setNewNotifTarget}
            employees={employees}
            onSaveNotification={handleSaveNotification}
            notifications={notifications}
            notifLoading={notifLoading}
            onRefreshNotifications={loadNotifications}
            onDeleteNotification={handleDeleteNotification}
          />
        )}

        {activeTab === 'leave' && (
          <LeaveManager
            leaveRequests={leaveRequests}
            leaveLoading={leaveLoading}
            leaveActionLoading={leaveActionLoading}
            onRefreshLeaveRequests={loadLeaveRequests}
            onUpdateLeaveStatus={handleUpdateLeaveStatus}
            onDeleteLeave={handleDeleteLeave}
          />
        )}
      </main>

      <AdminLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await handleLogout();
        }}
      />

      <DeleteEmployeeModal
        employee={employeeToDelete}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={handleDeleteEmployeeConfirm}
      />

      <ResetEmployeesModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetAllEmployees}
      />
    </div>
  );
}
