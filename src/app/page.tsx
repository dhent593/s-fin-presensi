"use client";

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { supabase, isSupabaseConfigured, saveSupabaseConfig } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import {
  Profile,
  AttendanceLog,
  GeofenceSettings,
  NotificationRecord,
  PayslipRecord,
  LeaveRequest,
  AttendanceSummary,
} from '@/types';
import { calculateDistance } from '@/lib/geo';
import { getWibDate, formatWibDate } from '@/lib/date';

// Employee Modular Components
import { HeaderGreeting } from '@/components/employee/HeaderGreeting';
import { DigitalClock } from '@/components/employee/DigitalClock';
import { AttendanceActionCard } from '@/components/employee/AttendanceActionCard';
import { AttendanceFeedbackCard } from '@/components/employee/AttendanceFeedbackCard';
import { AttendanceHistoryList } from '@/components/employee/AttendanceHistoryList';
import { LogoutConfirmModal } from '@/components/employee/LogoutConfirmModal';
import { AttendanceConfirmModal } from '@/components/employee/AttendanceConfirmModal';
import { PusatInformasiModal } from '@/components/employee/PusatInformasiModal';

export default function Home() {
  // Config state
  const [configured] = useState(() => isSupabaseConfigured());
  const [dbUrl, setDbUrl] = useState('');
  const [dbAnonKey, setDbAnonKey] = useState('');

  // Auth & User states
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nik, setNik] = useState('');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Clock state
  const [timeString, setTimeString] = useState('00:00:00');
  const [dateString, setDateString] = useState('Memuat tanggal...');

  // Geolocation & Geofence states
  const [geofenceText, setGeofenceText] = useState('Mengambil lokasi GPS...');
  const [geofenceStatus, setGeofenceStatus] = useState<'inside' | 'outside' | 'error' | 'loading'>('loading');

  // Attendance logging feedback
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [attendanceConfirm, setAttendanceConfirm] = useState<{ type: 'Masuk' | 'Pulang' | 'IstirahatMulai' | 'IstirahatSelesai' } | null>(null);
  const [breakActionLoading, setBreakActionLoading] = useState(false);

  // History logs
  const [history, setHistory] = useState<AttendanceLog[]>([]);
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);

  // Office settings
  const [officeSettings, setOfficeSettings] = useState<GeofenceSettings | null>(null);

  const geoSettingsRef = useRef({
    factory_lat: -7.7828,
    factory_lon: 110.3608,
    radius_meters: 50,
  });

  // Modals state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPayslipList, setShowPayslipList] = useState(false);
  const [hasUnreadSummary, setHasUnreadSummary] = useState(false);
  const [hasUnreadLeave, setHasUnreadLeave] = useState(false);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRecord | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  // Pusat Informasi states
  const [activeMainTab, setActiveMainTab] = useState<'notifications' | 'summary' | 'leave'>('summary');
  const [activePeriod, setActivePeriod] = useState<1 | 2>(() => getWibDate().getDate() <= 15 ? 1 : 2);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    totalMasuk: 0,
    totalTerlambat: 0,
    totalLemburMenit: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Leave Form states
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState('Izin');
  const [newLeaveStart, setNewLeaveStart] = useState('');
  const [newLeaveEnd, setNewLeaveEnd] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [leaveFeedback, setLeaveFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const prof = data as Profile;
        setProfile(prof);
        if (prof.role === 'admin') {
          window.location.href = '/admin';
        }
        return prof;
      }
      return null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setAuthError('Gagal memuat profil pengguna.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('geofence_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (!error && data) {
        setOfficeSettings(data as GeofenceSettings);
        if (data.factory_lat && data.factory_lon) {
          geoSettingsRef.current = {
            factory_lat: Number(data.factory_lat),
            factory_lon: Number(data.factory_lon),
            radius_meters: Number(data.radius_meters || 50),
          };
        }
      }
    } catch (err) {
      console.error('Error fetching office settings:', err);
    }
  };

  const fetchAttendanceHistory = async (targetUserId?: string) => {
    const uid = targetUserId || user?.id;
    if (!uid) return;
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('id, check_in, check_out, status, break_start, break_end')
        .eq('user_id', uid)
        .order('check_in', { ascending: false })
        .limit(7);

      if (error) throw error;
      const logs = (data || []) as AttendanceLog[];
      setHistory(logs);

      if (logs.length > 0) {
        const firstLog = logs[0];
        const logDate = getWibDate(firstLog.check_in);
        const today = getWibDate();
        const isToday =
          logDate.getFullYear() === today.getFullYear() &&
          logDate.getMonth() === today.getMonth() &&
          logDate.getDate() === today.getDate();
        setTodayLog(isToday ? firstLog : null);
      } else {
        setTodayLog(null);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchPayslips = async () => {
    if (!user) return;
    setPayslipLoading(true);
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('id, period_month, period_year, period_label, data, uploaded_at')
        .eq('user_id', user.id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      if (error) throw error;
      setPayslips((data || []) as PayslipRecord[]);
    } catch (err) {
      console.error('Error fetching payslips:', err);
    } finally {
      setPayslipLoading(false);
    }
  };

  const fetchLeaveHistory = async () => {
    if (!user) return;
    setLeaveLoading(true);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeaveHistory((data || []) as LeaveRequest[]);
    } catch (err) {
      console.error('Error fetching leave history:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  const calculateLateMinutes = (checkInStr: string) => {
    if (!checkInStr || !officeSettings?.work_start_time) return 0;
    try {
      const checkInDate = new Date(checkInStr);
      const wibCheckIn = new Date(checkInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const checkInHrs = wibCheckIn.getHours();
      const checkInMins = wibCheckIn.getMinutes();

      const dayOfWeek = wibCheckIn.getDay();
      const targetStartStr = (dayOfWeek === 6 && officeSettings.saturday_work_start_time)
        ? officeSettings.saturday_work_start_time
        : officeSettings.work_start_time;

      const [startHrs, startMins] = targetStartStr.split(':').map(Number);
      const checkInTotalMins = checkInHrs * 60 + checkInMins;
      const startTotalMins = startHrs * 60 + (startMins || 0);

      const diff = checkInTotalMins - startTotalMins;
      return diff > 0 ? diff : 0;
    } catch (err) {
      console.error('Error calculating late minutes:', err);
      return 0;
    }
  };

  const fetchAttendanceSummary = async (period: 1 | 2) => {
    if (!user) return;
    setSummaryLoading(true);
    try {
      const nowWib = getWibDate();
      const year = nowWib.getFullYear();
      const month = nowWib.getMonth();
      const mStr = String(month + 1).padStart(2, '0');
      const totalDays = new Date(year, month + 1, 0).getDate();
      const lastDayStr = String(totalDays).padStart(2, '0');

      let startDateStr: string;
      let endDateStr: string;
      if (period === 1) {
        startDateStr = `${year}-${mStr}-01T00:00:00+07:00`;
        endDateStr = `${year}-${mStr}-15T23:59:59.999+07:00`;
      } else {
        startDateStr = `${year}-${mStr}-16T00:00:00+07:00`;
        endDateStr = `${year}-${mStr}-${lastDayStr}T23:59:59.999+07:00`;
      }

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('check_in, check_out, status')
        .eq('user_id', user.id)
        .gte('check_in', startDateStr)
        .lte('check_in', endDateStr);

      if (error) throw error;

      let masuk = 0;
      let terlambat = 0;
      let lemburMenit = 0;

      const workEndStr = officeSettings?.work_end_time || '17:00:00';
      const threshold = officeSettings?.overtime_threshold_minutes ?? 30;

      (data || []).forEach((log: { check_in: string; check_out: string | null; status: string }) => {
        masuk++;
        if (log.status === 'Terlambat') terlambat++;

        if (log.check_out) {
          const checkOutTime = new Date(log.check_out);
          const wibCheckOut = new Date(checkOutTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
          const checkOutHrs = wibCheckOut.getHours();
          const checkOutMins = wibCheckOut.getMinutes();

          const dayOfWeek = wibCheckOut.getDay();
          const targetEndStr = (dayOfWeek === 6 && officeSettings?.saturday_work_end_time)
            ? officeSettings.saturday_work_end_time
            : workEndStr;

          const [endHrs, endMins] = targetEndStr.split(':').map(Number);
          const checkOutTotalMins = checkOutHrs * 60 + checkOutMins;
          const endTotalMins = endHrs * 60 + (endMins || 0);

          const diff = checkOutTotalMins - endTotalMins;
          if (diff > threshold) {
            lemburMenit += diff;
          }
        }
      });

      setAttendanceSummary({
        totalMasuk: masuk,
        totalTerlambat: terlambat,
        totalLemburMenit: lemburMenit,
      });
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setNotifications(data as NotificationRecord[]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newLeaveStart || !newLeaveEnd || !newLeaveReason.trim()) {
      setLeaveFeedback({ success: false, message: 'Harap isi semua kolom.' });
      return;
    }

    const start = new Date(newLeaveStart);
    const end = new Date(newLeaveEnd);
    if (end < start) {
      setLeaveFeedback({ success: false, message: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.' });
      return;
    }

    setLeaveLoading(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: user.id,
          type: newLeaveType,
          start_date: newLeaveStart,
          end_date: newLeaveEnd,
          reason: newLeaveReason.trim(),
          status: 'Pending',
        });

      if (error) throw error;

      setLeaveFeedback({ success: true, message: 'Pengajuan berhasil dikirim.' });
      setNewLeaveReason('');
      setNewLeaveStart('');
      setNewLeaveEnd('');
      fetchLeaveHistory();

      setTimeout(() => setLeaveFeedback(null), 3000);
    } catch (err: unknown) {
      setLeaveFeedback({
        success: false,
        message: (err instanceof Error ? err.message : String(err)) || 'Terjadi kesalahan.',
      });
    } finally {
      setLeaveLoading(false);
    }
  };

  const openPusatInformasi = (targetTab?: 'notifications' | 'summary' | 'leave') => {
    setShowPayslipList(true);
    const tab = targetTab || activeMainTab;
    if (targetTab) {
      setActiveMainTab(targetTab);
    }
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0];
      if (!localStorage.getItem(`seen_summary_${today}`)) setHasUnreadSummary(true);
      if (!localStorage.getItem(`seen_leave_${today}`)) setHasUnreadLeave(true);
    }

    if (tab === 'summary') {
      fetchAttendanceSummary(activePeriod);
      fetchPayslips();
    } else if (tab === 'notifications') {
      fetchNotifications();
    } else if (tab === 'leave') {
      fetchLeaveHistory();
    }
  };

  // 1. Fetch User Session on Configured
  useEffect(() => {
    if (!configured) return;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const prof = await fetchUserProfile(session.user.id);
          await fetchOfficeSettings();
          if (prof?.role === 'user') {
            await fetchAttendanceHistory(session.user.id);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const prof = await fetchUserProfile(session.user.id);
        await fetchOfficeSettings();
        if (prof?.role === 'user') {
          await fetchAttendanceHistory(session.user.id);
        }
      } else {
        setUser(null);
        setProfile(null);
        setPasscode('');
        setLoginLoading(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  // 2. Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })
      );

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      setDateString(formatWibDate(now, options));
    };

    const interval = setInterval(updateTime, 1000);
    updateTime();

    return () => clearInterval(interval);
  }, []);

  // 3. Live Geolocation Proximity Check
  useEffect(() => {
    if (!user || profile?.role !== 'user') return;

    let watchId: number;

    const startLocationWatch = () => {
      if (!navigator.geolocation) {
        setGeofenceStatus('error');
        setGeofenceText('GPS tidak didukung di perangkat ini');
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const settings = geoSettingsRef.current;
          const distance = calculateDistance(lat, lon, settings.factory_lat, settings.factory_lon);
          if (distance <= settings.radius_meters) {
            setGeofenceStatus('inside');
            setGeofenceText('GPS Aktif: Anda di dalam Area Pabrik');
          } else {
            setGeofenceStatus('outside');
            setGeofenceText(`GPS Aktif: Anda di luar Area Pabrik (Jarak: ${Math.round(distance)}m)`);
          }
        },
        (error) => {
          console.error('GPS error:', error);
          setGeofenceStatus('error');
          setGeofenceText('GPS Error: Aktifkan lokasi di HP Anda');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    startLocationWatch();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, profile]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nik.trim() || !passcode.trim()) {
      setAuthError('NIK dan PIN/Sandi wajib diisi.');
      return;
    }

    setLoginLoading(true);
    setAuthError('');
    await new Promise((r) => setTimeout(r, 50));

    try {
      const inputVal = nik.trim();
      const email = inputVal.includes('@') ? inputVal : `${inputVal}@pabrik.com`;
      const password = passcode.trim();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError('NIK/Email atau PIN/Sandi Anda salah. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Terjadi kesalahan sistem. Coba lagi nanti.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPasscode('');
    setAuthError('');
    setLoginLoading(false);
    setLoading(false);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl.trim() || !dbAnonKey.trim()) return;

    saveSupabaseConfig(dbUrl.trim(), dbAnonKey.trim());
    window.location.reload();
  };

  const handleBreak = async (type: 'Mulai' | 'Selesai') => {
    if (!user || !todayLog) return;
    setBreakActionLoading(true);
    setFeedback(null);

    if (geofenceStatus === 'outside') {
      setFeedback({
        success: false,
        message: 'Gagal! Anda berada di luar area pabrik untuk mencatat istirahat.',
      });
      setBreakActionLoading(false);
      return;
    }

    const field = type === 'Mulai' ? 'break_start' : 'break_end';
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .update({ [field]: new Date().toISOString() })
        .eq('id', todayLog.id);

      if (error) throw error;

      setFeedback({
        success: true,
        message:
          type === 'Mulai'
            ? 'Istirahat dimulai. Selamat beristirahat! 🌙'
            : 'Istirahat selesai. Semangat bekerja kembali! ☀️',
      });
      fetchAttendanceHistory();
    } catch (err: unknown) {
      setFeedback({
        success: false,
        message: `Gagal: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setBreakActionLoading(false);
    }
  };

  const triggerAttendance = async (type: 'Masuk' | 'Pulang') => {
    if (!user) return;

    setFeedback(null);
    setActionLoading(true);

    if (!navigator.geolocation) {
      setFeedback({
        success: false,
        message: 'Gagal! HP Anda tidak mendukung fitur deteksi lokasi.',
      });
      setActionLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const { data, error } = await supabase.rpc('log_attendance', {
            p_user_id: user.id,
            p_lat: lat,
            p_lon: lon,
            p_type: type,
          });

          if (error) {
            setFeedback({
              success: false,
              message: `Error: ${error.message}`,
            });
          } else {
            const res = data as { success: boolean; message: string };
            setFeedback({
              success: res.success,
              message: res.message,
            });
            if (res.success) {
              fetchAttendanceHistory();
            }
          }
        } catch {
          setFeedback({
            success: false,
            message: 'Terjadi kesalahan sistem saat menghubungi server.',
          });
        } finally {
          setActionLoading(false);
        }
      },
      () => {
        setFeedback({
          success: false,
          message: 'Gagal! Tolong aktifkan GPS/Lokasi di HP Anda terlebih dahulu.',
        });
        setActionLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full shadow-lg shadow-orange-500/20" />
            <div className="absolute inset-0 border-[5px] border-orange-500 border-t-transparent rounded-full animate-spin-fast [will-change:transform]" />
          </div>
          <p className="text-slate-800 font-extrabold text-xl tracking-wide">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // Developer Configuration Setup Screen
  if (!configured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-slate-500/5 blur-[80px]" />

        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-slate-100 max-w-md w-full animate-scale-up z-10 text-slate-800">
          <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-2">Konfigurasi Supabase</h2>
          <p className="text-sm font-medium text-gray-500 mb-8 leading-relaxed">
            Kunci API Supabase belum dikonfigurasi. Masukkan kredensial database untuk memulai pengujian secara lokal.
          </p>
          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">
                SUPABASE URL
              </label>
              <input
                type="url"
                required
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className="w-full bg-gray-50/50 border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:outline-none px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">
                SUPABASE ANON KEY
              </label>
              <input
                type="text"
                required
                value={dbAnonKey}
                onChange={(e) => setDbAnonKey(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full bg-gray-50/50 border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:outline-none px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300"
              />
            </div>
            <button
              type="submit"
              className="w-full hover-lift bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-2xl text-md transition shadow-xl shadow-orange-500/30 active:scale-98 cursor-pointer"
            >
              Simpan & Hubungkan
            </button>
          </form>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[90vw] h-[90vw] sm:w-[600px] sm:h-[600px] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[90vw] h-[90vw] sm:w-[600px] sm:h-[600px] rounded-full bg-slate-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />

        <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-orange-500/5 border border-white p-8 sm:p-10 relative z-10 animate-slide-up text-slate-800">
          <div className="text-center mb-8">
            <div className="inline-flex mb-4">
              <Image
                src="/favicon.png"
                alt="Great Attendance Logo"
                width={64}
                height={64}
                className="w-16 h-16 rounded-2xl shadow-md shadow-orange-500/10"
              />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Great Attendance</h1>
            <p className="text-sm font-semibold text-gray-400 mt-1">Sistem Absensi Karyawan Terintegrasi</p>
          </div>

          {authError && (
            <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-4 py-3.5 rounded-2xl mb-6 text-sm font-bold animate-shake">
              <div className="flex gap-2 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="w-5 h-5 flex-shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <span>{authError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nomor NIK / Email Admin
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan NIK atau Email Admin"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                PIN Passcode / Sandi
              </label>
              <input
                type="password"
                required
                placeholder="Masukkan PIN / Sandi"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full hover-lift bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-orange-500/20 active:scale-98 transition-all duration-300 mt-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            >
              {loginLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin hw-accelerate" />
                  <span>MEMPROSES...</span>
                </div>
              ) : (
                'MASUK KE APLIKASI'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // EMPLOYEE MOBILE ATTENDANCE DASHBOARD
  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-slate-50 flex flex-col relative shadow-2xl border-x border-slate-150 animate-page-enter text-slate-800 overflow-hidden">
      {/* Top Header & Greeting */}
      <HeaderGreeting
        profile={profile}
        onOpenPusatInformasi={() => openPusatInformasi()}
        onOpenLogout={() => setShowLogoutModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative z-20">
        {/* Digital Clock Banner */}
        <DigitalClock timeString={timeString} dateString={dateString} />

        {/* Content Body */}
        <main className="flex-1 flex flex-col min-h-0 px-6 -mt-10 relative z-20">
          <div className="shrink-0">
            {/* Action Card: Masuk/Pulang, Istirahat, Radar */}
            <AttendanceActionCard
              todayLog={todayLog}
              officeSettings={officeSettings}
              geofenceStatus={geofenceStatus}
              geofenceText={geofenceText}
              actionLoading={actionLoading}
              breakActionLoading={breakActionLoading}
              onConfirmAttendance={(type) => setAttendanceConfirm({ type })}
              onConfirmBreak={(type) => setAttendanceConfirm({ type })}
            />

            {/* Attendance Result Feedback Alert */}
            <AttendanceFeedbackCard feedback={feedback} onDismiss={() => setFeedback(null)} />
          </div>

          {/* 7-Day History List & Payslip Trigger */}
          <AttendanceHistoryList
            history={history}
            calculateLateMinutes={calculateLateMinutes}
            onOpenPayslips={() => openPusatInformasi('summary')}
          />
        </main>
      </div>

      {/* Modals */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await handleLogout();
        }}
      />

      <AttendanceConfirmModal
        confirmState={attendanceConfirm}
        onCancel={() => setAttendanceConfirm(null)}
        onConfirm={async (type) => {
          setAttendanceConfirm(null);
          if (type === 'IstirahatMulai') {
            await handleBreak('Mulai');
          } else if (type === 'IstirahatSelesai') {
            await handleBreak('Selesai');
          } else {
            await triggerAttendance(type);
          }
        }}
      />

      <PusatInformasiModal
        isOpen={showPayslipList}
        onClose={() => {
          setShowPayslipList(false);
          setSelectedPayslip(null);
        }}
        activeMainTab={activeMainTab}
        setActiveMainTab={setActiveMainTab}
        hasUnreadSummary={hasUnreadSummary}
        setHasUnreadSummary={setHasUnreadSummary}
        hasUnreadLeave={hasUnreadLeave}
        setHasUnreadLeave={setHasUnreadLeave}
        notifications={notifications}
        notifLoading={notifLoading}
        fetchNotifications={fetchNotifications}
        activePeriod={activePeriod}
        setActivePeriod={setActivePeriod}
        attendanceSummary={attendanceSummary}
        summaryLoading={summaryLoading}
        fetchAttendanceSummary={fetchAttendanceSummary}
        payslips={payslips}
        payslipLoading={payslipLoading}
        fetchPayslips={fetchPayslips}
        selectedPayslip={selectedPayslip}
        setSelectedPayslip={setSelectedPayslip}
        profile={profile}
        leaveFeedback={leaveFeedback}
        newLeaveType={newLeaveType}
        setNewLeaveType={setNewLeaveType}
        newLeaveStart={newLeaveStart}
        setNewLeaveStart={setNewLeaveStart}
        newLeaveEnd={newLeaveEnd}
        setNewLeaveEnd={setNewLeaveEnd}
        newLeaveReason={newLeaveReason}
        setNewLeaveReason={setNewLeaveReason}
        leaveLoading={leaveLoading}
        handleSubmitLeave={handleSubmitLeave}
        leaveHistory={leaveHistory}
        fetchLeaveHistory={fetchLeaveHistory}
      />
    </div>
  );
}
