"use client";

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { createClient, User } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

interface Profile {
  id: string;
  nik: string;
  full_name: string;
  role: 'user' | 'admin';
  passcode: string;
  created_at: string;
}

interface AttendanceLog {
  id: number;
  user_id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  latitude: number;
  longitude: number;
  profiles: {
    nik: string;
    full_name: string;
  } | null;
}

interface GeofenceSettings {
  id: number;
  factory_lat: number;
  factory_lon: number;
  radius_meters: number;
  work_start_time: string;
  work_end_time: string;
  saturday_work_start_time: string;
  saturday_work_end_time: string;
  break_start_time: string;
  break_end_time: string;
  late_tolerance_minutes: number;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Tabs navigation: 'dashboard' | 'employees' | 'recap' | 'geofencing'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'recap' | 'geofencing'>('dashboard');

  // Stats State
  const [stats, setStats] = useState({
    totalEmployees: 0,
    checkedIn: 0,
    late: 0,
    absent: 0
  });

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
    late_tolerance_minutes: 15
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
  const [recapMonth, setRecapMonth] = useState<number>(new Date().getMonth());
  const [recapYear, setRecapYear] = useState<number>(new Date().getFullYear());
  const [recapLogs, setRecapLogs] = useState<AttendanceLog[]>([]);
  const [recapLoading, setRecapLoading] = useState<boolean>(false);

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
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const isConfig = isSupabaseConfigured();
    setConfigured(isConfig);
    if (!isConfig) {
      window.location.href = '/'; // Redirect to config page at /
      return;
    }

    const todayOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setDateString(new Date().toLocaleDateString('id-ID', todayOptions));

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
      } catch (err) {
        console.error('Auth check error:', err);
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    checkAdminSession();
  }, [configured]);

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
          late_tolerance_minutes: Number(geoData.late_tolerance_minutes || 15)
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

      // 3. Fetch logs for today (local day range query)
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select('*, profiles(nik, full_name)')
        .gte('check_in', start)
        .lte('check_in', end)
        .order('check_in', { ascending: false });

      const todayLogs = (logsData || []) as AttendanceLog[];
      setLogs(todayLogs);

      // 4. Calculate Stats
      const uniqueCheckedIn = new Set(todayLogs.map(l => l.user_id)).size;
      const lateCount = todayLogs.filter(l => l.status === 'Terlambat').length;
      const absentCount = Math.max(0, totalEmployeesCount - uniqueCheckedIn);

      setStats({
        totalEmployees: totalEmployeesCount,
        checkedIn: uniqueCheckedIn,
        late: lateCount,
        absent: absentCount
      });

      // Fetch recap too
      loadMonthlyRecap(recapMonth, recapYear);

    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  // Load Monthly Recap Logs
  const loadMonthlyRecap = async (month: number, year: number) => {
    setRecapLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*, profiles(nik, full_name)')
        .gte('check_in', start)
        .lte('check_in', end)
        .order('check_in', { ascending: true });

      if (error) throw error;
      setRecapLogs((data || []) as AttendanceLog[]);
    } catch (err) {
      console.error('Error loading monthly recap:', err);
    } finally {
      setRecapLoading(false);
    }
  };

  useEffect(() => {
    if (configured) {
      loadMonthlyRecap(recapMonth, recapYear);
    }
  }, [recapMonth, recapYear, configured]);

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
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setGeofenceMessage('Pengaturan kantor dan jam kerja berhasil diperbarui!');
      loadAllDashboardData();
    } catch (err: any) {
      setGeofenceMessage(`Gagal memperbarui: ${err.message}`);
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
    } catch (err: any) {
      console.error('Save employee error:', err);
      setRegFeedback({
        success: false,
        message: err.message || `Gagal memproses data karyawan.`
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
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (rows.length <= 1) {
          throw new Error('File Excel kosong atau hanya berisi header.');
        }

        const headers = rows[0];
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

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];
          const name = row[namaIdx].toString().trim();
          const nikVal = row[nikIdx].toString().trim();
          
          // Role matching: check if "ADMIN" (case-insensitive), otherwise "user"
          const roleRaw = roleIdx !== -1 ? row[roleIdx]?.toString().trim() : '';
          const roleVal = roleRaw.toUpperCase() === 'ADMIN' ? 'admin' : 'user';

          // Date matching
          let tglDaftarVal = new Date();
          if (tglIdx !== -1 && row[tglIdx]) {
            const rawDate = row[tglIdx];
            if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
              tglDaftarVal = rawDate;
            } else {
              const parsed = Date.parse(rawDate.toString().trim());
              if (!isNaN(parsed)) {
                tglDaftarVal = new Date(parsed);
              }
            }
          }

          try {
            // Call the database function directly (bypasses Auth API rate limits!)
            const { data, error } = await supabase.rpc('admin_create_user', {
              p_nik: nikVal,
              p_full_name: name,
              p_role: roleVal,
              p_passcode: '123456', // default passcode
              p_created_at: tglDaftarVal.toISOString()
            });

            if (error) throw error;

            const res = data as { success: boolean; message: string };
            if (!res.success) {
              throw new Error(res.message);
            }

            successCount++;
          } catch (err) {
            console.error(`Gagal mendaftarkan NIK ${nikVal}:`, err);
            errorCount++;
          }

          setImportProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        }

        setImportFeedback({
          success: true,
          message: `Import Selesai! Berhasil: ${successCount} karyawan. Gagal/Sudah Ada: ${errorCount} karyawan. (Passcode default: 123456)`
        });

        // Reload lists
        await loadAllDashboardData();

      } catch (err: any) {
        setImportFeedback({
          success: false,
          message: err.message || 'Gagal membaca atau memproses file Excel.'
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
    } catch (err: any) {
      console.error(err);
      setRegFeedback({
        success: false,
        message: err.message || 'Gagal menghapus karyawan.'
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
    } catch (err: any) {
      console.error(err);
      setRegFeedback({
        success: false,
        message: err.message || 'Gagal mereset data karyawan.'
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
      const inDate = new Date(log.check_in);
      const inHrs = String(inDate.getHours()).padStart(2, '0');
      const inMins = String(inDate.getMinutes()).padStart(2, '0');
      setEditCheckIn(`${inHrs}:${inMins}`);

      if (log.check_out) {
        const outDate = new Date(log.check_out);
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
        const { error } = await supabase
          .from('attendance_logs')
          .update({
            check_in: checkInTimestamp,
            check_out: checkOutTimestamp,
            status: editStatus
          })
          .eq('id', log.id);

        if (error) throw error;
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
    } catch (err: any) {
      console.error('Error saving attendance edit:', err);
      alert('Gagal menyimpan perubahan absensi: ' + err.message);
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
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('id', editingCell.log.id);

      if (error) throw error;

      await loadMonthlyRecap(recapMonth, recapYear);
      setEditingCell(null);
    } catch (err: any) {
      console.error('Error deleting attendance record:', err);
      alert('Gagal menghapus absensi: ' + err.message);
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

  // Export Monthly Recap Grid to CSV file
  const handleExportRecapCSV = () => {
    const activeEmployees = processedEmployees.filter(p => p.role === 'user');
    if (activeEmployees.length === 0) {
      alert('Tidak ada data karyawan untuk diekspor.');
      return;
    }

    const daysCount = new Date(recapYear, recapMonth + 1, 0).getDate();
    const dateHeaders = Array.from({ length: daysCount }, (_, i) => `Tanggal ${i + 1}`);
    const headers = [
      'Nama Karyawan',
      'NIK',
      'Hadir 1-15',
      'Hadir 16-End',
      'Total Hadir',
      'Terlambat',
      ...dateHeaders
    ];

    const indonesianMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const rows = activeEmployees.map(emp => {
      const presentDays = recapLogs.filter(l => l.user_id === emp.id);
      const countPart1 = presentDays.filter(l => new Date(l.check_in).getDate() <= 15).length;
      const countPart2 = presentDays.filter(l => new Date(l.check_in).getDate() >= 16).length;
      const countTotal = presentDays.length;

      // Calculate total minutes late
      const totalLateMinutes = presentDays.reduce((acc, log) => {
        return acc + getMinutesLate(log.check_in, geofence.work_start_time);
      }, 0);

      const dailyStatus = Array.from({ length: daysCount }, (_, idx) => {
        const day = idx + 1;
        const log = recapLogs.find(l => {
          const cDate = new Date(l.check_in);
          return l.user_id === emp.id &&
                 cDate.getFullYear() === recapYear &&
                 cDate.getMonth() === recapMonth &&
                 cDate.getDate() === day;
        });

        if (log) {
          const timeStr = new Date(log.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
          return `${log.status} (${timeStr})`;
        }
        return 'Mangkir';
      });

      return [
        emp.full_name,
        emp.nik,
        `${countPart1} Hari`,
        `${countPart2} Hari`,
        `${countTotal} Hari`,
        formatLateMinutes(totalLateMinutes),
        ...dailyStatus
      ];
    });

    const csvContent = "\ufeff" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_bulanan_${indonesianMonths[recapMonth]}_${recapYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to filter and sort employee list dynamically
  const getFilteredAndSortedEmployees = () => {
    let result = [...employees];
    
    // 1. Filter by search input (Name or NIK)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(emp => 
        emp.full_name.toLowerCase().includes(term) || 
        emp.nik.toLowerCase().includes(term)
      );
    }

    // 2. Sort by criteria
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'excel') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'));
    } else if (sortBy === 'nik') {
      result.sort((a, b) => a.nik.localeCompare(b.nik, undefined, { numeric: true }));
    }

    return result;
  };

  const processedEmployees = getFilteredAndSortedEmployees();

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
      
      {/* SIDEBAR (NAVIGASI KIRI) */}
      <aside className="w-64 bg-white text-slate-800 flex flex-col justify-between hidden md:flex border-r border-slate-100 shadow-sm relative z-20">
        <div>
          {/* Logo / Judul */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-100">
            <img src="/favicon.png" alt="Great Attendance Logo" className="w-10 h-10 rounded-xl shadow-md shadow-orange-500/10" />
            <div>
              <h1 className="font-black tracking-wide leading-tight text-sm text-slate-900">Great Attendance</h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Admin Panel</p>
            </div>
          </div>
          
          {/* Menu Navigasi */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-bold text-sm text-left hover-lift ${
                activeTab === 'dashboard'
                  ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Dashboard Monitor
            </button>
            
             <button
              onClick={() => setActiveTab('employees')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-bold text-sm text-left hover-lift ${
                activeTab === 'employees'
                  ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Kelola Karyawan
            </button>

            <button
              onClick={() => setActiveTab('recap')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-bold text-sm text-left hover-lift ${
                activeTab === 'recap'
                  ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Rekap Bulanan
            </button>

            <button
              onClick={() => setActiveTab('geofencing')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-bold text-sm text-left hover-lift ${
                activeTab === 'geofencing'
                  ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774a1.125 1.125 0 01.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738a1.125 1.125 0 01-.12 1.45l-.774.773a1.125 1.125 0 01-1.45.12l-.737-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.93l-.15.893c-.09.543-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.149-.894c-.07-.425-.383-.765-.78-.93-.398-.165-.854-.143-1.204.107l-.738.527a1.125 1.125 0 01-1.45-.12l-.774-.772a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.774a1.125 1.125 0 011.45-.12l.738.527c.35.25.806.272 1.204.107.397-.165.71-.505.78-.93l.15-.893z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pengaturan Kantor
            </button>
          </nav>
        </div>
 
        {/* Profil Admin Singkat (Bawah) */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-orange-500/10">
              {adminProfile?.full_name[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="text-xs font-black block text-slate-800">{adminProfile?.full_name || 'Admin'}</p>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">{adminProfile?.role || 'Super Admin'}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowLogoutModal(true)}
            title="Keluar"
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition duration-200 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </aside>
 
      {/* AREA UTAMA Halaman (Kanan) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">
            {activeTab === 'dashboard' && 'Dashboard Monitor Presensi'}
            {activeTab === 'employees' && 'Kelola Data Karyawan'}
            {activeTab === 'geofencing' && 'Pengaturan Kantor'}
          </h2>
          <div className="text-sm font-bold text-gray-500 bg-gray-50 border px-4 py-2 rounded-xl">
            {dateString}
          </div>
        </header>

        {/* TAB 1: DASHBOARD MONITOR */}
        {activeTab === 'dashboard' && (
          <div className="p-8 space-y-8 flex-1 animate-fade-in">
            
            {/* BARIS STATISTIK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Total Karyawan */}
              <div className="hover-lift bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-extrabold text-gray-400 uppercase">Total Karyawan</p>
                  <p className="text-3xl font-black mt-1 text-gray-900">{stats.totalEmployees} <span className="text-xs font-medium text-gray-400">Orang</span></p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                </div>
              </div>
              {/* Hadir */}
              <div className="hover-lift bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-extrabold text-gray-400 uppercase">Sudah Absen Masuk</p>
                  <p className="text-3xl font-black mt-1 text-emerald-600">{stats.checkedIn} <span className="text-xs font-medium text-gray-400">Orang</span></p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              {/* Terlambat */}
              <div className="hover-lift bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-extrabold text-gray-400 uppercase">Terlambat Hari Ini</p>
                  <p className="text-3xl font-black mt-1 text-amber-500">{stats.late} <span className="text-xs font-medium text-gray-400">Orang</span></p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              {/* Belum Hadir */}
              <div className="hover-lift bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-extrabold text-gray-400 uppercase">Belum Absen</p>
                  <p className="text-3xl font-black mt-1 text-red-500">{stats.absent} <span className="text-xs font-medium text-gray-400">Orang</span></p>
                </div>
                <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
            </div>

            {/* LAYOUT DUA KOLOM */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Kiri: Tabel Presensi Hari Ini */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Aktivitas Presensi Hari Ini</h3>
                  <button 
                    onClick={handleExportCSV}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Ekspor (.CSV)
                  </button>
                </div>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-100/80 rounded-2xl shadow-inner bg-slate-50/20">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md shadow-[0_1px_0_rgba(241,245,249,1)]">
                      <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-4 rounded-l-xl">Nama / NIK</th>
                        <th className="py-3 px-4">Jam Masuk</th>
                        <th className="py-3 px-4">Jam Pulang</th>
                        <th className="py-3 px-4 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-50 font-bold text-gray-700">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400 font-bold">
                            Belum ada aktivitas presensi hari ini.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => {
                          const timeIn = new Date(log.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
                          const timeOut = log.check_out 
                            ? new Date(log.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')
                            : '--:--';

                          let badgeClass = '';
                          if (log.status === 'Tepat Waktu' || log.status === 'Sudah Pulang') {
                            badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                          } else if (log.status === 'Terlambat') {
                            badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                          }

                          return (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition">
                              <td className="py-4 px-4">
                                <p className="font-extrabold text-gray-900">{log.profiles?.full_name || 'Karyawan'}</p>
                                <p className="text-xs text-gray-400 font-bold">NIK: {log.profiles?.nik || '-'}</p>
                              </td>
                              <td className="py-4 px-4 text-gray-600">{timeIn}</td>
                              <td className="py-4 px-4 text-gray-600">{timeOut}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex text-xs px-2.5 py-1 rounded-full border ${badgeClass}`}>
                                  {log.status}
                                  {log.status === 'Terlambat' && (
                                    ` (${getMinutesLate(log.check_in, geofence.work_start_time)} Menit)`
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kanan: Ringkasan Pengaturan Geofence Cepat */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-fit space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Titik Pabrik Aktif</h3>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">Koordinat yang digunakan oleh HP karyawan untuk validasi geofencing.</p>
                  
                  <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Garis Lintang (Latitude)</p>
                      <p className="text-sm font-extrabold text-gray-800">{geofence.factory_lat}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Garis Bujur (Longitude)</p>
                      <p className="text-sm font-extrabold text-gray-800">{geofence.factory_lon}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Jarak Radius Maksimal</p>
                      <p className="text-sm font-extrabold text-orange-600">{geofence.radius_meters} Meter</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('geofencing')}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-md active:scale-95"
                >
                  Ubah Koordinat Area
                </button>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: KELOLA KARYAWAN */}
        {activeTab === 'employees' && (
          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 animate-fade-in">
            
            {/* Kiri: Daftar Karyawan Terdaftar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Daftar Karyawan Terdaftar</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="hover-lift border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Reset Data
                  </button>

                  <input
                    type="file"
                    id="excel-import"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleImportExcel}
                  />
                  <label
                    htmlFor="excel-import"
                    className="hover-lift bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Import Excel
                  </label>
                </div>
              </div>

              {importFeedback && (
                <div className={`p-4 rounded-xl mb-5 text-xs font-bold border flex items-center justify-between ${
                  importFeedback.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  <span>{importFeedback.message}</span>
                  <button 
                    onClick={() => setImportFeedback(null)} 
                    className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              )}
              
              {/* FILTER DAN SEARCH BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cari Karyawan (Nama / NIK)</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Masukkan nama atau NIK..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 font-extrabold text-xs cursor-pointer focus:outline-none"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Urutan Data Karyawan</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
                  >
                    <option value="newest">Paling Baru Didaftarkan</option>
                    <option value="excel">Sesuai Urutan File Excel</option>
                    <option value="name">Nama Karyawan (A - Z)</option>
                    <option value="nik">Nomor NIK (Terkecil)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[550px] overflow-y-auto border border-slate-100/80 rounded-2xl shadow-inner bg-slate-50/20">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md shadow-[0_1px_0_rgba(241,245,249,1)]">
                    <tr className="text-xs font-bold text-gray-400 uppercase">
                      <th className="py-3 px-4 rounded-l-xl">Nama Karyawan</th>
                      <th className="py-3 px-4">NIK</th>
                      <th className="py-3 px-4">Role / Jabatan</th>
                      <th className="py-3 px-4">PIN Passcode</th>
                      <th className="py-3 px-4">Tgl Daftar</th>
                      <th className="py-3 px-4 rounded-r-xl text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50 font-bold text-gray-700">
                    {processedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-400 font-bold">
                          {searchTerm ? 'Tidak ditemukan karyawan yang cocok.' : 'Belum ada data karyawan.'}
                        </td>
                      </tr>
                    ) : (
                      processedEmployees.map((emp) => {
                        const dateReg = new Date(emp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        return (
                          <tr key={emp.id} className="hover:bg-gray-50/50 transition">
                            <td className="py-3.5 px-4 text-gray-900 font-extrabold">{emp.full_name}</td>
                            <td className="py-3.5 px-4 text-gray-600">{emp.nik}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                emp.role === 'admin' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                              }`}>
                                {emp.role === 'admin' ? 'Admin' : 'Karyawan'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <span>{visiblePasscodes[emp.id] ? emp.passcode || '123456' : '••••••'}</span>
                                <button
                                  type="button"
                                  onClick={() => togglePasscodeVisibility(emp.id)}
                                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded hover:bg-slate-50 transition cursor-pointer"
                                  title={visiblePasscodes[emp.id] ? "Sembunyikan" : "Tampilkan"}
                                >
                                  {visiblePasscodes[emp.id] ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-gray-400 text-xs">{dateReg}</td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(emp)}
                                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-xl transition cursor-pointer"
                                  title="Edit Karyawan"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                {emp.id !== currentUser?.id && (
                                  <button
                                    type="button"
                                    onClick={() => setEmployeeToDelete(emp)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-xl transition cursor-pointer"
                                    title="Hapus Karyawan"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kanan: Form Registrasi / Edit Karyawan */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit animate-fade-in" key={editingEmployee ? 'edit' : 'register'}>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {editingEmployee ? 'Edit Data Karyawan' : 'Daftarkan Karyawan Baru'}
              </h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                {editingEmployee 
                  ? 'Ubah rincian profil, jabatan, atau passcode pin untuk karyawan ini.' 
                  : 'Buat akun login presensi bagi karyawan baru. Gunakan NIK yang valid dan passcode angka.'}
              </p>

              {regFeedback && (
                <div className={`p-4 rounded-xl mb-5 text-xs font-bold border ${
                  regFeedback.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {regFeedback.message}
                </div>
              )}

              <form onSubmit={handleSaveEmployee} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-400 uppercase mb-1">Nomor NIK</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 20260199"
                    value={newNik}
                    onChange={(e) => setNewNik(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-400 uppercase mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap karyawan"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-400 uppercase mb-1">PIN Passcode (6 Angka)</label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="Contoh: 123456"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold text-center tracking-widest focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-400 uppercase mb-1">Role Jabatan</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                  >
                    <option value="user">Karyawan Biasa</option>
                    <option value="admin">Administrator Panel</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition shadow-md active:scale-95 cursor-pointer"
                >
                  {regLoading 
                    ? (editingEmployee ? 'Menyimpan...' : 'Mendaftarkan...') 
                    : (editingEmployee ? 'Simpan Perubahan' : 'Daftarkan Karyawan')}
                </button>
                {editingEmployee && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition active:scale-95 cursor-pointer"
                  >
                    Batal Edit
                  </button>
                )}
              </form>
            </div>

          </div>
        )}

        {/* TAB 4: REKAP BULANAN */}
        {activeTab === 'recap' && (
          <div className="p-8 flex-1 flex flex-col animate-fade-in w-full overflow-x-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Rekap Bulanan Kehadiran Karyawan</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Lihat rekap absensi lengkap karyawan dalam satu bulan. Arahkan kursor ke tanda centang/silang untuk melihat detail jam kerja.
                  </p>
                </div>
                
                {/* Selector Bulan & Tahun + Tombol Ekspor */}
                <div className="flex gap-2 shrink-0 items-center">
                  <select
                    value={recapMonth}
                    onChange={(e) => setRecapMonth(Number(e.target.value))}
                    className="bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ].map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={recapYear}
                    onChange={(e) => setRecapYear(Number(e.target.value))}
                    className="bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {[2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleExportRecapCSV}
                    className="hover-lift bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Ekspor (.CSV)
                  </button>
                </div>
              </div>

              {/* FILTER DAN SEARCH BAR REKAP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="sm:col-span-2">
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Cari nama atau NIK karyawan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 pl-10 pr-10 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition-all shadow-sm"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 font-extrabold text-xs cursor-pointer focus:outline-none"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
                  >
                    <option value="newest">Urutan: Terbaru</option>
                    <option value="excel">Urutan: Sesuai Excel</option>
                    <option value="name">Urutan: Nama (A - Z)</option>
                    <option value="nik">Urutan: NIK (Terkecil)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TABEL GRID BULANAN */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden flex-1 flex flex-col">
              {recapLoading ? (
                <div className="py-20 flex flex-col items-center justify-center flex-1">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-bold text-gray-500">Memuat data rekap...</p>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[550px] w-full flex-1 border border-slate-100/80 rounded-2xl shadow-inner bg-slate-50/20">
                  <table className="min-w-max w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_rgba(241,245,249,1)]">
                      <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                        <th className="py-4 px-4 sticky left-0 top-0 bg-white z-30 border-r border-gray-100 rounded-l-xl w-[180px]">Nama Karyawan</th>
                        <th className="py-4 px-2 text-center sticky left-[180px] top-0 bg-slate-50 border-r border-gray-100 z-30 w-[70px]">Hadir 1-15</th>
                        <th className="py-4 px-2 text-center sticky left-[250px] top-0 bg-slate-50 border-r border-gray-100 z-30 w-[70px]">Hadir 16-31</th>
                        <th className="py-4 px-2 text-center sticky left-[320px] top-0 bg-slate-50 border-r border-gray-100 z-30 w-[60px]">Total</th>
                        <th className="py-4 px-2 text-center sticky left-[380px] top-0 bg-slate-50 border-r border-gray-100 z-30 w-[65px]">Terlambat</th>
                        {Array.from({ length: new Date(recapYear, recapMonth + 1, 0).getDate() }, (_, i) => i + 1).map((day) => (
                          <th key={day} className="py-4 px-2 text-center w-[75px] text-[10px] sticky top-0 bg-slate-50/90 z-20">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-50 font-bold text-gray-700">
                      {processedEmployees.filter(p => p.role === 'user').length === 0 ? (
                        <tr>
                          <td colSpan={36} className="py-12 text-center text-gray-400 font-bold">
                            {searchTerm ? 'Tidak ditemukan karyawan yang cocok.' : 'Belum ada data karyawan terdaftar.'}
                          </td>
                        </tr>
                      ) : (
                        processedEmployees.filter(p => p.role === 'user').map((emp) => {
                          const daysInMonth = Array.from({ length: new Date(recapYear, recapMonth + 1, 0).getDate() }, (_, i) => i + 1);
                          const presentDays = recapLogs.filter(l => l.user_id === emp.id);
                          const countPart1 = presentDays.filter(l => new Date(l.check_in).getDate() <= 15).length;
                          const countPart2 = presentDays.filter(l => new Date(l.check_in).getDate() >= 16).length;
                          const countTotal = presentDays.length;

                          // Calculate total minutes late
                          const totalLateMinutes = presentDays.reduce((acc, log) => {
                            return acc + getMinutesLate(log.check_in, geofence.work_start_time);
                          }, 0);
                          return (
                            <tr key={emp.id} className="hover:bg-gray-50/50 transition">
                              {/* Kolom Nama Pinned */}
                              <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] w-[180px]">
                                <p className="font-extrabold text-gray-900 text-xs">{emp.full_name}</p>
                                <p className="text-[10px] text-gray-400 font-bold">NIK: {emp.nik}</p>
                              </td>

                              {/* Kolom Ringkasan Kehadiran Pinned */}
                              <td className="py-3 px-2 sticky left-[180px] bg-slate-50 z-10 border-r border-gray-100 text-center font-black text-emerald-600 text-xs w-[70px]">
                                {countPart1} Hari
                              </td>
                              <td className="py-3 px-2 sticky left-[250px] bg-slate-50 z-10 border-r border-gray-100 text-center font-black text-emerald-600 text-xs w-[70px]">
                                {countPart2} Hari
                              </td>
                              <td className="py-3 px-2 sticky left-[320px] bg-slate-50 z-10 border-r border-gray-100 text-center font-black text-orange-600 text-xs w-[60px]">
                                {countTotal} Hari
                              </td>
                              <td className="py-3 px-2 sticky left-[380px] bg-slate-50 z-10 border-r border-gray-100 text-center font-black text-red-500 text-xs w-[65px]">
                                {formatLateMinutes(totalLateMinutes)}
                              </td>
                              
                              {/* Kolom Tanggal */}
                              {daysInMonth.map((day) => {
                                const log = recapLogs.find(l => {
                                  const cDate = new Date(l.check_in);
                                  return l.user_id === emp.id &&
                                         cDate.getFullYear() === recapYear &&
                                         cDate.getMonth() === recapMonth &&
                                         cDate.getDate() === day;
                                });

                                const dateObj = new Date(recapYear, recapMonth, day);
                                const isSunday = dateObj.getDay() === 0;

                                return (
                                  <td 
                                    key={day} 
                                    onClick={() => handleEditCellClick(emp, day, log)}
                                    className="py-2.5 px-1.5 text-center align-middle w-[75px] cursor-pointer hover:bg-orange-50/50 transition duration-150"
                                    title="Klik untuk tambah/edit absensi"
                                  >
                                    {log ? (
                                      <div className="relative group flex flex-col items-center justify-center p-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl transition duration-200 hover:bg-emerald-100 cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3.5 h-3.5 mb-0.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                        <span className="text-[8px] font-black tracking-tighter">
                                          {new Date(log.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                                        </span>
                                        
                                        {/* Tooltip on Hover */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-left p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-30 text-[10px] space-y-1 font-bold">
                                          <p className="text-orange-400 font-extrabold">Absensi {day} {[
                                            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                                          ][recapMonth]}</p>
                                          <p>Masuk: <span className="text-white">{new Date(log.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB</span> ({log.status})</p>
                                          <p>Pulang: <span className="text-white">{log.check_out ? new Date(log.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB' : '--:--'}</span></p>
                                          <p>Istirahat: <span className="text-white">{geofence.break_start_time} - {geofence.break_end_time} WIB</span></p>
                                          <p className="text-[9px] text-slate-400">GPS: {Number(log.latitude).toFixed(5)}, {Number(log.longitude).toFixed(5)}</p>
                                          <p className="text-[8px] text-orange-300 mt-1">💡 Klik untuk koreksi absensi</p>
                                        </div>
                                      </div>
                                    ) : isSunday ? (
                                      <div className="relative group flex flex-col items-center justify-center p-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl transition duration-200 hover:bg-slate-200 cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3.5 h-3.5 mb-0.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-[8px] font-black tracking-tighter">Libur</span>

                                        {/* Tooltip on Hover */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-slate-900 text-white text-center py-2 px-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-30 text-[10px] font-bold">
                                          <p className="text-slate-300 font-extrabold">Hari Minggu</p>
                                          <p className="text-slate-400">Libur Akhir Pekan</p>
                                          <p className="text-[8px] text-orange-300 mt-1">💡 Klik untuk input lembur</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="relative group flex flex-col items-center justify-center p-1 bg-red-50 text-red-500 border border-red-100 rounded-xl transition duration-200 hover:bg-red-100 cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3 h-3 mb-0.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span className="text-[8px] font-black tracking-tighter">Mangkir</span>

                                        {/* Tooltip on Hover */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-slate-900 text-white text-center py-2 px-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-30 text-[10px] font-bold">
                                          <p className="text-red-400 font-extrabold">Tidak Hadir</p>
                                          <p className="text-slate-200">Tidak ada absensi pada hari ini.</p>
                                          <p className="text-[8px] text-orange-300 mt-1">💡 Klik untuk input manual</p>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PENGATURAN GEOFENCING */}
        {activeTab === 'geofencing' && (
          <div className="p-8 max-w-6xl w-full flex-1 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* KIRI: FORM CONFIG */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Pengaturan & Aturan Kantor</h3>
                  <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                    Atur titik koordinat lokasi geofencing kantor, radius toleransi jarak, serta jadwal jam kerja absensi karyawan.
                  </p>

                  {geofenceMessage && (
                    <div className={`p-4 rounded-xl mb-6 text-sm font-bold border ${
                      geofenceMessage.includes('berhasil') 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {geofenceMessage}
                    </div>
                  )}

                  <form onSubmit={handleUpdateGeofence} className="space-y-6">
                    {/* SEKSI 1: LOKASI & RADIUS */}
                    <div className="border-b border-gray-100 pb-5">
                      <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3">1. Lokasi & Radius Geofencing</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Garis Lintang (Latitude)</label>
                          <input
                            type="text"
                            required
                            value={geofence.factory_lat}
                            onChange={(e) => setGeofence({ ...geofence, factory_lat: Number(e.target.value) })}
                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Garis Bujur (Longitude)</label>
                          <input
                            type="text"
                            required
                            value={geofence.factory_lon}
                            onChange={(e) => setGeofence({ ...geofence, factory_lon: Number(e.target.value) })}
                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Radius Batas Toleransi</label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            required
                            min={5}
                            max={10000}
                            value={geofence.radius_meters}
                            onChange={(e) => setGeofence({ ...geofence, radius_meters: Number(e.target.value) })}
                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                          />
                          <span className="absolute right-4 text-xs font-extrabold text-gray-400">Meter</span>
                        </div>
                      </div>
                    </div>

                    {/* SEKSI 2: JAM KERJA & ATURAN */}
                    <div className="pb-2">
                      <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3">2. Jam Kerja & Aturan Absensi</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Jam Masuk Kantor</label>
                          <input
                            type="time"
                            required
                            value={geofence.work_start_time}
                            onChange={(e) => setGeofence({ ...geofence, work_start_time: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Jam Pulang Kantor</label>
                          <input
                            type="time"
                            required
                            value={geofence.work_end_time}
                            onChange={(e) => setGeofence({ ...geofence, work_end_time: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Mulai Istirahat</label>
                          <input
                            type="time"
                            required
                            value={geofence.break_start_time}
                            onChange={(e) => setGeofence({ ...geofence, break_start_time: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Selesai Istirahat</label>
                          <input
                            type="time"
                            required
                            value={geofence.break_end_time}
                            onChange={(e) => setGeofence({ ...geofence, break_end_time: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                        <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2.5">
                          Jadwal Sabtu (Setengah Hari)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Masuk Sabtu</label>
                            <input
                              type="time"
                              required
                              value={geofence.saturday_work_start_time}
                              onChange={(e) => setGeofence({ ...geofence, saturday_work_start_time: e.target.value })}
                              className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Pulang Sabtu</label>
                            <input
                              type="time"
                              required
                              value={geofence.saturday_work_end_time}
                              onChange={(e) => setGeofence({ ...geofence, saturday_work_end_time: e.target.value })}
                              className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Toleransi Keterlambatan</label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            required
                            min={0}
                            max={240}
                            value={geofence.late_tolerance_minutes}
                            onChange={(e) => setGeofence({ ...geofence, late_tolerance_minutes: Number(e.target.value) })}
                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                          />
                          <span className="absolute right-4 text-xs font-extrabold text-gray-400">Menit</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={geofenceLoading}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm py-3.5 rounded-xl transition shadow-md active:scale-95 cursor-pointer"
                    >
                      {geofenceLoading ? 'Menyimpan...' : 'Simpan Pengaturan Kantor'}
                    </button>
                  </form>
                </div>
              </div>

              {/* KANAN: MAP PREVIEW */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Pratinjau Peta Lokasi</h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  Peta interaktif di bawah menunjukkan posisi pabrik berdasarkan koordinat di samping.
                </p>
                
                <div className="flex-1 w-full min-h-[300px] rounded-2xl border border-gray-200 overflow-hidden relative shadow-inner bg-slate-100">
                  <iframe
                    title="Map Preview"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${geofence.factory_lon - 0.003}%2C${geofence.factory_lat - 0.002}%2C${geofence.factory_lon + 0.003}%2C${geofence.factory_lat + 0.002}&layer=mapnik&marker=${geofence.factory_lat}%2C${geofence.factory_lon}`}
                    className="w-full h-full min-h-[300px]"
                  ></iframe>
                </div>

                <div className="mt-4 flex gap-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${geofence.factory_lat},${geofence.factory_lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-center font-bold text-xs py-3 rounded-xl transition shadow-md hover-lift cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    Buka di Google Maps
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* CONFIRM LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl animate-scale-up text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Keluar Panel Admin?</h3>
            <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">Apakah Anda yakin ingin keluar dari panel admin?</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  setShowLogoutModal(false);
                  await handleLogout();
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-red-500/25"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EXCEL IMPORT PROGRESS MODAL */}
      {importLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl text-center animate-scale-up">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Mengimport Data Karyawan...</h3>
            <p className="text-sm font-semibold text-slate-500">
              Memproses {importProgress?.current} dari {importProgress?.total} data.
            </p>
            <p className="text-xs text-slate-400 mt-2">Mohon tunggu, jangan menutup halaman ini.</p>
          </div>
        </div>
      )}
      {/* DELETE EMPLOYEE CONFIRMATION MODAL */}
      {employeeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl text-center animate-scale-up">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Hapus Karyawan?</h3>
            <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus karyawan <strong className="text-slate-800">{employeeToDelete.full_name}</strong> (NIK: {employeeToDelete.nik})?
              Semua data riwayat absensi karyawan ini juga akan dihapus permanen.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleDeleteEmployeeConfirm}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-red-500/25"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CONFIRM RESET EMPLOYEES MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl text-center animate-scale-up">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Reset Semua Karyawan?</h3>
            <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
              Tindakan ini akan <strong className="text-red-600">MENGHAPUS SEMUA DATA KARYAWAN</strong> (kecuali akun Admin Anda) serta menghapus seluruh riwayat absensi bulanan mereka secara permanen!
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setShowResetModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleResetAllEmployees}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-red-500/25"
              >
                Ya, Reset Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ATTENDANCE CORRECTION MODAL */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">Koreksi Absensi Manual</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  Karyawan: <span className="text-slate-800">{editingCell.employee.full_name}</span> (NIK: {editingCell.employee.nik})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none p-2 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Info Tanggal */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Koreksi</p>
                  <p className="text-sm font-extrabold text-slate-800">
                    {editingCell.day} {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ][recapMonth]} {recapYear}
                  </p>
                </div>
              </div>

              {/* Form Input Jam Masuk & Pulang */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Jam Masuk (WIB)</label>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Jam Pulang (WIB)</label>
                  <input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    placeholder="--:--"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 shadow-sm"
                  />
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Kosongkan jika belum absen pulang</p>
                </div>
              </div>

              {/* Status Absensi */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status Kehadiran</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
                >
                  <option value="Tepat Waktu">Tepat Waktu (Hadir)</option>
                  <option value="Terlambat">Terlambat (Hadir)</option>
                  <option value="Sudah Pulang">Sudah Pulang (Hadir Lengkap)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {/* Button Hapus (hanya jika log sudah ada sebelumnya) */}
              {editingCell.log ? (
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleDeleteAttendanceRecord}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer text-xs disabled:opacity-50 border border-red-100 flex items-center justify-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer text-xs"
                >
                  Batal
                </button>
              )}

              {/* Button Batal / Tutup (Jika ada tombol Hapus, maka tombol ini adalah Batal, jika tidak, tombol ini disatukan) */}
              {editingCell.log && (
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer text-xs"
                >
                  Batal
                </button>
              )}

              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveAttendanceEdit}
                className={`text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-lg ${
                  editingCell.log ? 'col-span-1 bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'col-span-2 bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                }`}
              >
                {isSavingEdit ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
