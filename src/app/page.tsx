"use client";

import { useEffect, useState, useTransition } from 'react';
import { supabase, isSupabaseConfigured, saveSupabaseConfig, clearSupabaseConfig } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  nik: string;
  full_name: string;
  role: 'user' | 'admin';
  passcode: string;
}

interface AttendanceLog {
  id: number;
  check_in: string;
  check_out: string | null;
  status: string;
  break_start?: string | null;
  break_end?: string | null;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
}

interface PayslipRecord {
  id: number;
  period_month: number;
  period_year: number;
  period_label: string;
  data: Record<string, any>;
  uploaded_at: string;
}

export default function Home() {
  const [isPending, startTransition] = useTransition();

  // Config state
  const [configured, setConfigured] = useState(false);
  const [dbUrl, setDbUrl] = useState('');
  const [dbAnonKey, setDbAnonKey] = useState('');

  // Auth & User states
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nik, setNik] = useState('');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Clock state
  const [timeString, setTimeString] = useState('00:00:00');
  const [dateString, setDateString] = useState('Memuat tanggal...');

  // Geolocation & Geofence states
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
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

  // Office settings (for lateness + break time calculation)
  const [officeSettings, setOfficeSettings] = useState<{
    work_start_time: string;
    work_end_time: string;
    saturday_work_start_time: string;
    saturday_work_end_time: string;
    break_start_time: string;
    break_end_time: string;
  } | null>(null);

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Payslip (Slip Gaji) states
  const [showPayslipList, setShowPayslipList] = useState(false);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRecord | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  // Notification & Summary & Leave states
  const [activeMainTab, setActiveMainTab] = useState<'notifications' | 'summary' | 'leave'>('summary');
  const [activePeriod, setActivePeriod] = useState<1 | 2>(new Date().getDate() <= 15 ? 1 : 2);
  const [attendanceSummary, setAttendanceSummary] = useState({ totalMasuk: 0, totalTerlambat: 0, totalLemburMenit: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Leave Form states
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState('Izin');
  const [newLeaveStart, setNewLeaveStart] = useState('');
  const [newLeaveEnd, setNewLeaveEnd] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [leaveFeedback, setLeaveFeedback] = useState<{success: boolean, message: string} | null>(null);

  // 1. Initial configuration check
  useEffect(() => {
    const isConfig = isSupabaseConfigured();
    setConfigured(isConfig);
    if (!isConfig) {
      setLoading(false);
    }
  }, []);

  // 2. Fetch User Session on Configured
  useEffect(() => {
    if (!configured) return;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
          await fetchOfficeSettings();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setLoading(false);
      }
    };

    checkSession();

    // Subscribe to Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
        await fetchOfficeSettings();
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  // 3. Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('id-ID', { hour12: false }));
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      setDateString(now.toLocaleDateString('id-ID', options));
    };

    const interval = setInterval(updateTime, 1000);
    updateTime();

    return () => clearInterval(interval);
  }, []);

  // 4. Live Geolocation Proximity Check
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
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserCoords({ lat, lon });
          
          // Check proximity to factory
          try {
            const { data: settings } = await supabase
              .from('geofence_settings')
              .select('*')
              .eq('id', 1)
              .single();

            if (settings) {
              const distance = calculateDistance(lat, lon, settings.factory_lat, settings.factory_lon);
              if (distance <= settings.radius_meters) {
                setGeofenceStatus('inside');
                setGeofenceText('GPS Aktif: Anda di dalam Area Pabrik');
              } else {
                setGeofenceStatus('outside');
                setGeofenceText(`GPS Aktif: Anda di luar Area Pabrik (Jarak: ${Math.round(distance)}m)`);
              }
            } else {
              setGeofenceStatus('inside'); // Fallback if no settings
              setGeofenceText('GPS Aktif: Menunggu verifikasi server');
            }
          } catch (err) {
            console.error('Error fetching settings:', err);
            setGeofenceStatus('inside');
            setGeofenceText('GPS Aktif');
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

  // 5. Fetch Attendance History
  useEffect(() => {
    if (user && profile?.role === 'user') {
      fetchAttendanceHistory();
    }
  }, [user, profile]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data as Profile);
        if (data.role === 'admin') {
          // Redirect to admin panel
          window.location.href = '/admin';
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setAuthError('Gagal memuat profil pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('id, check_in, check_out, status, break_start, break_end')
        .eq('user_id', user.id)
        .order('check_in', { ascending: false })
        .limit(7);

      if (error) throw error;
      const logs = (data || []) as AttendanceLog[];
      setHistory(logs);

      // Cek apakah log pertama adalah hari ini (WIB)
      if (logs.length > 0) {
        const firstLog = logs[0];
        const logDate = new Date(new Date(firstLog.check_in).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
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

  const fetchOfficeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('geofence_settings')
        .select('work_start_time, work_end_time, saturday_work_start_time, saturday_work_end_time, break_start_time, break_end_time')
        .eq('id', 1)
        .single();
      if (!error && data) {
        setOfficeSettings(data);
      }
    } catch (err) {
      console.error('Error fetching office settings:', err);
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

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newLeaveStart || !newLeaveEnd || !newLeaveReason.trim()) {
      setLeaveFeedback({ success: false, message: 'Harap isi semua kolom.' });
      return;
    }
    
    // Validate dates
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
          status: 'Pending'
        });
      
      if (error) throw error;
      
      setLeaveFeedback({ success: true, message: 'Pengajuan berhasil dikirim.' });
      setNewLeaveReason('');
      setNewLeaveStart('');
      setNewLeaveEnd('');
      fetchLeaveHistory();
      
      // Auto clear feedback after 3 seconds
      setTimeout(() => setLeaveFeedback(null), 3000);
    } catch (err: any) {
      setLeaveFeedback({ success: false, message: err.message || 'Terjadi kesalahan.' });
    } finally {
      setLeaveLoading(false);
    }
  };

  const fetchAttendanceSummary = async (period: 1 | 2) => {
    if (!user) return;
    setSummaryLoading(true);
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      
      let startDateStr, endDateStr;
      if (period === 1) {
        // 1 - 15
        const startDate = new Date(year, month, 1, 0, 0, 0);
        const endDate = new Date(year, month, 15, 23, 59, 59);
        startDateStr = startDate.toISOString();
        endDateStr = endDate.toISOString();
      } else {
        // 16 - End of month
        const startDate = new Date(year, month, 16, 0, 0, 0);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);
        startDateStr = startDate.toISOString();
        endDateStr = endDate.toISOString();
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
      const [endHour, endMin] = workEndStr.split(':').map(Number);

      (data || []).forEach((log: any) => {
        masuk++;
        if (log.status === 'Terlambat') terlambat++;
        
        if (log.check_out) {
          const checkOutTime = new Date(log.check_out);
          const workEnd = new Date(checkOutTime);
          workEnd.setHours(endHour, endMin, 0, 0);
          
          if (checkOutTime > workEnd) {
            const diffMs = checkOutTime.getTime() - workEnd.getTime();
            lemburMenit += Math.floor(diffMs / 60000);
          }
        }
      });

      setAttendanceSummary({
        totalMasuk: masuk,
        totalTerlambat: terlambat,
        totalLemburMenit: lemburMenit
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
        // Policies automatically filter `is_active=true and (target_user_id is null or auth.uid)`
        .order('created_at', { ascending: false });
      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (showPayslipList && user) {
      if (activeMainTab === 'notifications') {
        fetchNotifications();
      } else if (activeMainTab === 'summary') {
        fetchAttendanceSummary(activePeriod);
        fetchPayslips();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMainTab, activePeriod, showPayslipList, user, officeSettings]);

  const calculateLateMinutes = (checkInStr: string) => {
    if (!checkInStr || !officeSettings?.work_start_time) return 0;
    try {
      const checkInDate = new Date(checkInStr);
      // Convert check-in time to local WIB time (GMT+7)
      const wibCheckIn = new Date(checkInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const checkInHrs = wibCheckIn.getHours();
      const checkInMins = wibCheckIn.getMinutes();

      // Check if Saturday (6)
      const dayOfWeek = wibCheckIn.getDay(); // 0 = Sunday, 6 = Saturday
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


  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // meters
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nik.trim() || !passcode.trim()) {
      setAuthError('NIK dan PIN/Sandi wajib diisi.');
      return;
    }

    setLoading(true);
    setAuthError('');
    // Allow browser to paint the loading state before blocking main thread
    await new Promise(r => setTimeout(r, 50));

    try {
      // Map NIK to internal email, or use directly if it contains '@' (admin email)
      const inputVal = nik.trim();
      const email = inputVal.includes('@') ? inputVal : `${inputVal}@pabrik.com`;
      const password = passcode.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError('NIK/Email atau PIN/Sandi Anda salah. Silakan coba lagi.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Terjadi kesalahan sistem. Coba lagi nanti.');
      setLoading(false);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  // Setup Dev config handler
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl.trim() || !dbAnonKey.trim()) return;

    saveSupabaseConfig(dbUrl.trim(), dbAnonKey.trim());
    window.location.reload();
  };

  // Handler absen istirahat
  const handleBreak = async (type: 'Mulai' | 'Selesai') => {
    if (!user || !todayLog) return;
    setBreakActionLoading(true);
    setFeedback(null);

    const field = type === 'Mulai' ? 'break_start' : 'break_end';
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .update({ [field]: new Date().toISOString() })
        .eq('id', todayLog.id);

      if (error) throw error;

      setFeedback({
        success: true,
        message: type === 'Mulai'
          ? 'Istirahat dimulai. Selamat beristirahat! 🌙'
          : 'Istirahat selesai. Semangat bekerja kembali! ☀️',
      });
      fetchAttendanceHistory();
    } catch (err: any) {
      setFeedback({ success: false, message: `Gagal: ${err.message}` });
    } finally {
      setBreakActionLoading(false);
    }
  };

  // Clock-in / Clock-out handler
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
          // Call the server RPC function
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
        } catch (err: any) {
          setFeedback({
            success: false,
            message: 'Terjadi kesalahan sistem saat menghubungi server.',
          });
        } finally {
          setActionLoading(false);
        }
      },
      (error) => {
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
            {/* Static shadow ring */}
            <div className="absolute inset-0 rounded-full shadow-lg shadow-orange-500/20"></div>
            {/* Hardware accelerated spinning ring */}
            <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin hw-accelerate"></div>
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
        {/* Glow effects */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-[80px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-slate-500/5 blur-[80px]"></div>

        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-slate-100 max-w-md w-full animate-scale-up z-10 text-slate-800">
          <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-2">Konfigurasi Supabase</h2>
          <p className="text-sm font-medium text-gray-500 mb-8 leading-relaxed">
            Kunci API Supabase belum dikonfigurasi. Masukkan kredensial database untuk memulai pengujian secara lokal.
          </p>
          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">SUPABASE URL</label>
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
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">SUPABASE ANON KEY</label>
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
              className="w-full hover-lift bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-2xl text-md transition shadow-xl shadow-orange-500/30 active:scale-98"
            >
              Simpan & Hubungkan
            </button>
          </form>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN (UPGRADED AESTHETICS & RESPONSIVENESS)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        {/* Ambient Glowing Background Orbs */}
        <div className="absolute top-[-20%] right-[-20%] w-[90vw] h-[90vw] sm:w-[600px] sm:h-[600px] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[90vw] h-[90vw] sm:w-[600px] sm:h-[600px] rounded-full bg-slate-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>

        <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-orange-500/5 border border-white p-8 sm:p-10 relative z-10 animate-slide-up text-slate-800">
          <div className="text-center mb-8">
            <div className="inline-flex mb-4">
              <img src="/favicon.png" alt="Great Attendance Logo" className="w-16 h-16 rounded-2xl shadow-md shadow-orange-500/10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Great Attendance</h1>
            <p className="text-sm font-semibold text-gray-400 mt-1">Sistem Absensi Karyawan Terintegrasi</p>
          </div>

          {authError && (
            <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-4 py-3.5 rounded-2xl mb-6 text-sm font-bold animate-shake">
              <div className="flex gap-2 items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{authError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nomor NIK / Email Admin</label>
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">PIN Passcode / Sandi</label>
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
              className="w-full hover-lift bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-orange-500/20 active:scale-98 transition-all duration-300 mt-2 cursor-pointer"
            >
              MASUK KE APLIKASI
            </button>
          </form>
        </div>
      </div>
    );
  }

  // EMPLOYEE MOBILE ATTENDANCE DASHBOARD
  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-slate-50 flex flex-col relative shadow-2xl border-x border-slate-150 animate-page-enter text-slate-800 overflow-hidden">
      <div className="shrink-0 bg-orange-500 text-white px-6 pt-8 pb-4 flex justify-between items-center z-30 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-orange-100 text-xs font-semibold">Selamat Bekerja,</p>
          <h1 className="text-xl font-black tracking-wide leading-tight">{profile?.full_name || 'Karyawan'}</h1>
          <p className="text-[10px] text-orange-200 mt-0.5 font-bold uppercase">NIK: {profile?.nik || '-'}</p>
        </div>
        <div className="flex gap-2 relative z-10">
          {/* Tombol Notifikasi Slip Gaji */}
          <button 
            onClick={() => {
              setShowPayslipList(true);
            }}
            title="Notifikasi Slip Gaji"
            className="bg-white/10 hover:bg-white/20 active:scale-90 p-2.5 rounded-xl transition-all duration-300 shadow-md backdrop-blur-md border border-white/10 cursor-pointer relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-orange-500 animate-pulse"></span>
          </button>

          {/* Tombol Keluar */}
          <button 
            onClick={() => setShowLogoutModal(true)}
            title="Keluar Aplikasi"
            className="bg-white/10 hover:bg-white/20 active:scale-90 p-2.5 rounded-xl transition-all duration-300 shadow-md backdrop-blur-md border border-white/10 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-0 relative z-20">
        
        {/* ORANGE CLOCK BACKGROUND EXTENSION */}
        <div className="bg-gradient-to-b from-orange-500 to-orange-600 px-6 pt-5 pb-16 rounded-b-[3rem] shadow-sm relative overflow-hidden">
          {/* Widget Waktu & Tanggal */}
          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-5 text-center border border-white/20 shadow-inner relative z-10">
            <p className="text-4xl font-black text-white tracking-wider drop-shadow-sm">{timeString}</p>
            <p className="text-xs font-black text-orange-100 mt-1.5 uppercase tracking-wider">{dateString}</p>
          </div>
        </div>

        {/* KONTEN UTAMA - KARTU PUTIH */}
        <main className="flex-1 flex flex-col min-h-0 px-6 -mt-10 relative z-20">
          
          <div className="shrink-0">
          {/* AREA KARTU ABSENSI UTAMA */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 mb-6 text-center animate-slide-up">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">TEKAN TOMBOL DI BAWAH UNTUK ABSEN</p>
          
          {/* Grid Tombol Besar */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tombol Masuk */}
            <button 
              onClick={() => setAttendanceConfirm({ type: 'Masuk' })}
              disabled={actionLoading || breakActionLoading}
              className="hover-lift flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 disabled:opacity-50 disabled:scale-100 text-white rounded-3xl p-6 transition-all duration-300 shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              <div className="bg-white/20 p-3 rounded-2xl mb-3 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-md font-black tracking-wide">ABSEN MASUK</span>
            </button>

            {/* Tombol Keluar */}
            <button 
              onClick={() => setAttendanceConfirm({ type: 'Pulang' })}
              disabled={actionLoading || breakActionLoading}
              className="hover-lift flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 active:scale-95 disabled:opacity-50 disabled:scale-100 text-white rounded-3xl p-6 transition-all duration-300 shadow-lg shadow-slate-700/20 cursor-pointer"
            >
              <div className="bg-white/20 p-3 rounded-2xl mb-3 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </div>
              <span className="text-md font-black tracking-wide">ABSEN PULANG</span>
            </button>
          </div>

          {/* Tombol Istirahat — muncul hanya di jam istirahat */}
          {(() => {
            if (!officeSettings?.break_start_time || !officeSettings?.break_end_time) return null;
            const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            const cur = now.getHours() * 60 + now.getMinutes();
            const [bsH, bsM] = officeSettings.break_start_time.split(':').map(Number);
            const [beH, beM] = officeSettings.break_end_time.split(':').map(Number);
            const isBreakTime = cur >= bsH * 60 + bsM && cur < beH * 60 + beM;
            if (!isBreakTime || !todayLog) return null;
            const hasBreakEnd = !!todayLog.break_end;
            if (hasBreakEnd) return null;
            const isResting = !!todayLog.break_start;
            return (
              <button
                onClick={() => setAttendanceConfirm({ type: isResting ? 'IstirahatSelesai' : 'IstirahatMulai' })}
                disabled={actionLoading || breakActionLoading}
                className={`hover-lift mt-4 w-full flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 disabled:scale-100 text-white rounded-3xl p-5 transition-all duration-300 shadow-lg cursor-pointer ${
                  isResting
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/20'
                    : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/20'
                }`}
              >
                <div className="bg-white/20 p-3 rounded-2xl mb-2 shadow-inner">
                  {isResting ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3v5.25a2.25 2.25 0 002.25 2.25h.75M7.5 3H6m1.5 0h1.5m6 0v5.25a2.25 2.25 0 01-2.25 2.25h-.75m3-7.5h1.5m-1.5 0H15M12 10.5v10.5m-4.5-6h9" />
                    </svg>
                  )}
                </div>
                <span className="text-md font-black tracking-wide">
                  {isResting ? '☀️ SELESAI ISTIRAHAT' : '🍽️ MULAI ISTIRAHAT'}
                </span>
                <span className="text-[10px] opacity-75 mt-0.5">
                  {isResting ? `Mulai: ${new Date(todayLog.break_start!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB` : `${officeSettings.break_start_time} – ${officeSettings.break_end_time} WIB`}
                </span>
              </button>
            );
          })()}

          {/* Indikator Status Lokasi Geofencing */}
          <div className="mt-5">
            {geofenceStatus === 'inside' && (
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-extrabold border border-emerald-100 shadow-sm animate-fade-in">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {geofenceText}
              </div>
            )}
            {geofenceStatus === 'outside' && (
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-extrabold border border-amber-100 shadow-sm animate-fade-in">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                {geofenceText}
              </div>
            )}
            {geofenceStatus === 'loading' && (
              <div className="inline-flex items-center gap-2 bg-slate-50 text-slate-500 px-4 py-2 rounded-full text-xs font-extrabold border border-slate-100 shadow-sm">
                <span className="w-2 h-2 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                {geofenceText}
              </div>
            )}
            {geofenceStatus === 'error' && (
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-xs font-extrabold border border-red-100 shadow-sm animate-fade-in">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                {geofenceText}
              </div>
            )}
          </div>
        </div>

        {/* FEEDBACK HASIL ABSEN (SENIOR FRIENDLY - LARGE TEXT CARDS) */}
        {feedback && (
          <div 
            onClick={() => setFeedback(null)}
            className={`cursor-pointer rounded-3xl p-5 mb-6 text-center border shadow-lg transition-all active:scale-98 animate-scale-up ${
              feedback.success 
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10' 
                : 'bg-red-500 text-white border-red-600 shadow-red-500/10'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              {feedback.success ? (
                <div className="bg-white text-emerald-600 p-2.5 rounded-full shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              ) : (
                <div className="bg-white text-red-600 p-2.5 rounded-full shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-xl font-black leading-snug">{feedback.message}</p>
            <p className="text-[10px] opacity-75 mt-2 font-bold uppercase tracking-wider">Ketuk kartu ini untuk menutup</p>
          </div>
        )}

        {/* RIWAYAT ABSENSI 7 HARI TERAKHIR (TITLE FIXED) */}
        <div className="animate-slide-up [animation-delay:150ms]">
          <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-3.5 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Riwayat Absen 7 Hari Terakhir
          </h3>
        </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-10 pr-2">
          <div className="mb-6 animate-slide-up [animation-delay:150ms]">
          
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 font-extrabold text-sm shadow-sm">
                Belum ada riwayat absensi.
              </div>
            ) : (
              history.map((log) => {
                const date = new Date(log.check_in);
                const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
                const dateNum = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                
                const timeIn = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
                const timeOut = log.check_out 
                  ? new Date(log.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')
                  : '--:--';

                let statusColor = 'text-slate-500 bg-slate-50';
                if (log.status === 'Tepat Waktu' || log.status === 'Sudah Pulang') {
                  statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100/70';
                } else if (log.status === 'Terlambat') {
                  statusColor = 'text-amber-700 bg-amber-50 border-amber-100/70';
                }

                return (
                  <div key={log.id} className="hover-lift bg-white p-4.5 rounded-[1.5rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all duration-300">
                    <div>
                      <p className="font-black text-sm text-slate-800">{dayName}, {dateNum}</p>
                      <p className={`text-[10px] font-black mt-1 inline-block px-3 py-0.5 rounded-full border ${statusColor}`}>
                        {log.status.toUpperCase()}
                        {log.status === 'Terlambat' && (
                          ` (${calculateLateMinutes(log.check_in)} Menit)`
                        )}
                      </p>
                    </div>
                    <div className="text-right text-xs font-bold text-slate-400 space-y-1">
                       <p>Masuk: <span className="text-slate-700 font-extrabold">{timeIn}</span></p>
                       <p>Pulang: <span className="text-slate-700 font-extrabold">{timeOut}</span></p>
                       {log.break_start && (
                         <p className="text-blue-500">Istirahat: <span className="font-extrabold">
                           {new Date(log.break_start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                           {log.break_end ? ` – ${new Date(log.break_end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}` : ' (blm selesai)'}
                         </span></p>
                       )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

          <br/>
          {/* TOMBOL LIHAT SLIP GAJI */}
          <div className="mb-4 animate-slide-up [animation-delay:200ms]">
            <button
              onClick={() => setShowPayslipList(true)}
              className="hover-lift w-full flex items-center justify-between bg-white border border-purple-100 hover:border-purple-300 px-5 py-4 rounded-2xl shadow-sm transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-gray-900">Lihat Slip Gaji</p>
                  <p className="text-[10px] text-gray-400 font-bold">Rincian gaji bulanan Anda</p>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          </div>
        </main>
      </div>

      {/* CONFIRM LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl animate-scale-up text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Keluar Aplikasi?</h3>
            <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">Apakah Anda yakin ingin keluar dari akun Anda?</p>
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
      {/* CONFIRM ATTENDANCE MODAL */}
      {attendanceConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center w-full animate-scale-up border border-slate-100 relative overflow-hidden text-slate-800">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Konfirmasi Absensi</h3>
            <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
              {attendanceConfirm.type === 'IstirahatMulai' && 'Anda akan mencatat waktu mulai istirahat sekarang.'}
              {attendanceConfirm.type === 'IstirahatSelesai' && 'Anda akan mencatat waktu selesai istirahat sekarang.'}
              {(attendanceConfirm.type === 'Masuk' || attendanceConfirm.type === 'Pulang') &&
                <>Apakah Anda yakin sudah ada di area pabrik untuk melakukan <span className="text-orange-500">Absen {attendanceConfirm.type}</span>?</>}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setAttendanceConfirm(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition active:scale-95 cursor-pointer text-xs"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const type = attendanceConfirm.type;
                  setAttendanceConfirm(null);
                  if (type === 'IstirahatMulai') {
                    await handleBreak('Mulai');
                  } else if (type === 'IstirahatSelesai') {
                    await handleBreak('Selesai');
                  } else {
                    await triggerAttendance(type as 'Masuk' | 'Pulang');
                  }
                }}
                className={`w-full text-white font-bold py-3 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg text-xs ${
                  attendanceConfirm.type === 'IstirahatMulai' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25' :
                  attendanceConfirm.type === 'IstirahatSelesai' ? 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/25' :
                  'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
                }`}
              >
                Ya, Catat
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PAYSLIP LIST MODAL */}
      {showPayslipList && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in" onClick={() => { setShowPayslipList(false); setSelectedPayslip(null); }}>
          <div className="bg-white w-full max-w-md rounded-t-[2rem] p-6 h-[85vh] max-h-[750px] flex flex-col shadow-2xl animate-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            {!selectedPayslip ? (
              <>
                <div className="flex items-center justify-between mb-5 shrink-0">
                  <h3 className="text-xl font-black text-gray-900">Pusat Informasi</h3>
                  <button onClick={() => setShowPayslipList(false)} className="p-2 hover:bg-gray-100 rounded-xl transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Main Tabs */}
                <div className="relative flex p-1 bg-slate-100 rounded-2xl mb-5 shrink-0 z-0">
                  {/* Sliding Background Indicator */}
                  <div 
                    className="absolute top-1 bottom-1 bg-white shadow-sm rounded-xl ease-spring z-0 hw-accelerate"
                    style={{ 
                      width: 'calc(33.333% - 2.66px)',
                      transition: 'transform 0.4s',
                      transform: activeMainTab === 'notifications' 
                        ? 'translateX(0)' 
                        : activeMainTab === 'summary' 
                        ? 'translateX(100%)' 
                        : 'translateX(200%)' 
                    }} 
                  />
                  <button 
                    onClick={() => startTransition(() => setActiveMainTab('notifications'))}
                    className={`relative z-10 flex-1 min-w-[80px] py-2 px-3 text-[11px] md:text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${activeMainTab === 'notifications' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Notifikasi
                  </button>
                  <button 
                    onClick={() => startTransition(() => setActiveMainTab('summary'))}
                    className={`relative z-10 flex-1 min-w-[80px] py-2 px-3 text-[11px] md:text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${activeMainTab === 'summary' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Absensi & Gaji
                  </button>
                  <button 
                    onClick={() => { startTransition(() => { setActiveMainTab('leave'); }); fetchLeaveHistory(); }}
                    className={`relative z-10 flex-1 min-w-[80px] py-2 px-3 text-[11px] md:text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${activeMainTab === 'leave' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Izin / Cuti
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative custom-scrollbar pr-2">
                  {activeMainTab === 'notifications' ? (
                    <div className="py-2 animate-tab-soft">
                      {notifLoading ? (
                        <div className="text-center py-8">
                          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-xs font-bold text-slate-400">Memuat Notifikasi...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="py-8 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-slate-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                          </div>
                          <p className="font-extrabold text-slate-500 text-sm">Belum ada notifikasi baru.</p>
                          <p className="text-xs text-slate-400 mt-1">Pengumuman HR atau peringatan akan muncul di sini.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 pb-4">
                          {notifications.map(n => (
                            <div key={n.id} className={`p-4 rounded-2xl border shadow-sm ${n.type === 'info' ? 'bg-blue-50/50 border-blue-100' : n.type === 'warning' ? 'bg-orange-50/50 border-orange-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${n.type === 'info' ? 'bg-blue-100 text-blue-700' : n.type === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{n.type === 'warning' ? 'Peringatan' : n.type}</span>
                                <span className="text-[10px] text-gray-400 font-bold">{new Date(n.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                              <h4 className="text-sm font-black text-slate-800 mb-1">{n.title}</h4>
                              <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{n.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                ) : activeMainTab === 'summary' ? (
                  <div className="py-2 animate-tab-soft">
                    {/* Period Tabs */}
                    <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => setActivePeriod(1)}
                        className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all border cursor-pointer ${activePeriod === 1 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        Tgl 1 - 15
                      </button>
                      <button 
                        onClick={() => setActivePeriod(2)}
                        className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all border cursor-pointer ${activePeriod === 2 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        Tgl 16 - Akhir
                      </button>
                    </div>

                    {/* Attendance Summary */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4 mb-5 shadow-inner">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Rincian Absensi Periode {activePeriod}</h4>
                      {summaryLoading ? (
                        <div className="py-4 text-center">
                          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                            <p className="text-xl font-black text-slate-800">{attendanceSummary.totalMasuk}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Hari Kerja</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-red-50 text-center shadow-sm">
                            <p className="text-xl font-black text-red-500">{attendanceSummary.totalTerlambat}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Terlambat</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-blue-50 text-center shadow-sm">
                            <p className="text-xl font-black text-blue-500 flex items-baseline justify-center gap-0.5">
                              {Math.floor(attendanceSummary.totalLemburMenit / 60)}<span className="text-xs font-bold text-blue-300">h</span> {attendanceSummary.totalLemburMenit % 60}<span className="text-xs font-bold text-blue-300">m</span>
                            </p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Lembur</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payslips */}
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Slip Gaji Terkait</h4>
                    {payslipLoading ? (
                      <div className="py-8 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      </div>
                    ) : payslips.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="font-extrabold text-slate-400 text-xs">Belum ada slip gaji.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {payslips.map((slip) => {
                          const mNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                          return (
                            <button
                              key={slip.id}
                              onClick={() => setSelectedPayslip(slip)}
                              className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-2xl border border-purple-100 transition cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-extrabold text-sm text-gray-900">Slip Gaji {mNames[slip.period_month - 1]} {slip.period_year} <span className="text-purple-600">— {slip.period_label}</span></p>
                                  <p className="text-[10px] text-gray-400 font-bold">
                                    Gaji Bersih: <span className="text-purple-700">
                                      {slip.data.total_gaji_bersih != null
                                        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(slip.data.total_gaji_bersih)
                                        : '-'}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-purple-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : activeMainTab === 'leave' ? (
                  <div className="py-2 animate-tab-soft">
                    
                    {/* Feedback Alert */}
                    {leaveFeedback && (
                      <div className={`p-3 mb-4 text-xs font-bold rounded-xl ${leaveFeedback.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {leaveFeedback.message}
                      </div>
                    )}

                    {/* Form Pengajuan Baru */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-5">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Buat Pengajuan Baru</h4>
                      <form onSubmit={handleSubmitLeave} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Jenis</label>
                            <select 
                              value={newLeaveType}
                              onChange={(e) => setNewLeaveType(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-slate-700"
                            >
                              <option value="Izin">Izin</option>
                              <option value="Sakit">Sakit</option>
                              <option value="Cuti">Cuti</option>
                            </select>
                          </div>
                          <div></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Mulai Tgl</label>
                            <input 
                              type="date"
                              required
                              value={newLeaveStart}
                              onChange={(e) => setNewLeaveStart(e.target.value)}
                              className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Sampai Tgl</label>
                            <input 
                              type="date"
                              required
                              value={newLeaveEnd}
                              onChange={(e) => setNewLeaveEnd(e.target.value)}
                              className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-slate-700"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Alasan / Keterangan</label>
                          <textarea 
                            required
                            rows={2}
                            value={newLeaveReason}
                            onChange={(e) => setNewLeaveReason(e.target.value)}
                            placeholder="Tuliskan keterangan lengkap..."
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:bg-white transition-all font-medium text-slate-700 resize-none"
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={leaveLoading}
                          className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                        >
                          {leaveLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : 'Kirim Pengajuan'}
                        </button>
                      </form>
                    </div>

                    {/* Riwayat Pengajuan */}
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Riwayat Anda</h4>
                      {leaveHistory.length === 0 ? (
                        <p className="text-xs text-center font-bold text-slate-400 py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Belum ada riwayat pengajuan.</p>
                      ) : (
                        <div className="space-y-2">
                          {leaveHistory.map((item) => (
                            <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{item.type}</span>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                  item.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                                  'bg-amber-50 text-amber-600'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              <div className="text-xs font-extrabold text-slate-800 mb-1">
                                {new Date(item.start_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})} 
                                {item.start_date !== item.end_date && ` - ${new Date(item.end_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}`}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium line-clamp-2">{item.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                ) : null}
              </div>
              </>
            ) : (
              /* DETAIL SLIP GAJI - FORMAL DESIGN */
              (() => {
                const d = selectedPayslip.data;
                const mNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                const fmt = (v: any) => v != null && v !== 0 && v !== '0' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v)) : null;
                const hasPotongan = d.potongan || d.potongan_lain_lain || d.potongan_masuk_jam;
                const upahHariText = (d.upah_per_hari != null && d.total_masuk != null && d.upah_per_hari !== 0 && d.total_masuk !== 0)
                  ? `${new Intl.NumberFormat('id-ID').format(Number(d.upah_per_hari))} × ${d.total_masuk} hari`
                  : null;
                return (
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 animate-fade-in pb-6">
                    {/* Back Button */}
                    <button onClick={() => setSelectedPayslip(null)} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 mb-4 cursor-pointer transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                      Kembali ke Daftar
                    </button>

                    {/* ═══ HEADER DOKUMEN FORMAL ═══ */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 mb-5 text-white">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase">Slip Gaji Karyawan</p>
                          <p className="text-base font-black text-white mt-0.5">PT. SENNDYT SARUNGTANGAN KREATIF</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Jl. Pasar Turi, Sidomulyo, Bambanglipuro, Bantul</p>
                        </div>
                        <div className="text-right">
                          <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Periode</p>
                            <p className="text-xs font-black text-white">{mNames[selectedPayslip.period_month - 1]} {selectedPayslip.period_year}</p>
                            <p className="text-[10px] font-extrabold text-orange-300">{selectedPayslip.period_label}</p>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-white/10 pt-3 grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nama</p>
                          <p className="text-[11px] font-extrabold text-white">{d.nama || profile?.full_name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">NIK</p>
                          <p className="text-[11px] font-extrabold text-white">{profile?.nik}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Jabatan</p>
                          <p className="text-[11px] font-extrabold text-white">{d.jabatan || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* ═══ TABEL RINCIAN GAJI ═══ */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
                      {/* Header Tabel */}
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-200">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Rincian Pendapatan</p>
                      </div>

                      {/* Gaji Pokok & Upah Harian */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-500">Gaji Pokok (Info)</span>
                          <span className="text-[10px] font-bold text-gray-400">{fmt(d.gaji_pokok) || '-'}</span>
                        </div>
                        {upahHariText && (
                          <div className="flex justify-between items-center mt-2">
                            <div>
                              <span className="text-xs font-bold text-gray-700 block">Upah Kehadiran</span>
                              <span className="text-[10px] text-gray-400 font-medium mt-0.5">Rp {upahHariText}</span>
                            </div>
                            <span className="text-xs font-extrabold text-gray-900">{fmt(d.upah_per_hari * d.total_masuk)}</span>
                          </div>
                        )}
                      </div>

                      {/* Tunjangan */}
                      {d.tunjangan != null && d.tunjangan !== 0 && (
                        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                          <span className="text-xs font-bold text-gray-700">Tunjangan</span>
                          <span className="text-xs font-extrabold text-gray-900">{fmt(d.tunjangan)}</span>
                        </div>
                      )}

                      {/* Premi */}
                      {d.premi != null && d.premi !== 0 && (
                        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                          <span className="text-xs font-bold text-gray-700">Premi</span>
                          <span className="text-xs font-extrabold text-gray-900">{fmt(d.premi)}</span>
                        </div>
                      )}

                      {/* Gaji Lembur */}
                      {d.gaji_lembur != null && d.gaji_lembur !== 0 && (
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-700">Gaji Lembur</span>
                            <span className="text-xs font-extrabold text-gray-900">{fmt(d.gaji_lembur)}</span>
                          </div>
                          {d.total_lembur_jam != null && d.total_lembur_jam !== 0 && (
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{d.total_lembur_jam} jam × Rp {new Intl.NumberFormat('id-ID').format(Number(d.upah_lembur_per_jam))}/jam</p>
                          )}
                        </div>
                      )}

                      {/* Upah Borongan */}
                      {d.upah_borongan != null && d.upah_borongan !== 0 && (
                        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                          <span className="text-xs font-bold text-gray-700">Upah Borongan</span>
                          <span className="text-xs font-extrabold text-gray-900">{fmt(d.upah_borongan)}</span>
                        </div>
                      )}

                      {/* Over Target */}
                      {d.over_target != null && d.over_target !== 0 && (
                        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                          <span className="text-xs font-bold text-gray-700">Over Target</span>
                          <span className="text-xs font-extrabold text-gray-900">{fmt(d.over_target)}</span>
                        </div>
                      )}

                      {/* Lain-lain (Pendapatan Tambahan) */}
                      {d.lain_lain != null && d.lain_lain !== 0 && (
                        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                          <span className="text-xs font-bold text-gray-700">Lain-lain</span>
                          <span className="text-xs font-extrabold text-gray-900">{fmt(d.lain_lain)}</span>
                        </div>
                      )}

                      {/* Subtotal Pendapatan */}
                      <div className="flex justify-between items-center px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                        <span className="text-xs font-black text-emerald-800">Jumlah Pendapatan</span>
                        <span className="text-sm font-black text-emerald-700">{fmt(d.total_gaji_b) || fmt(d.total_gaji_a) || '-'}</span>
                      </div>

                      {/* POTONGAN */}
                      {hasPotongan && (
                        <>
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-200">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Rincian Potongan</p>
                          </div>

                          {d.potongan != null && d.potongan !== 0 && (
                            <div className="px-4 py-2.5 border-b border-gray-100">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-700">Potongan Keterlambatan</span>
                                <span className="text-xs font-extrabold text-red-600">{fmt(d.potongan)}</span>
                              </div>
                              {d.potongan_masuk_jam != null && d.potongan_masuk_jam !== 0 && (
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">{d.potongan_masuk_jam} jam</p>
                              )}
                            </div>
                          )}

                          {d.potongan_lain_lain != null && d.potongan_lain_lain !== 0 && (
                            <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                              <span className="text-xs font-bold text-gray-700">Potongan Lain-lain</span>
                              <span className="text-xs font-extrabold text-red-600">{fmt(d.potongan_lain_lain)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* ═══ TOTAL GAJI BERSIH ═══ */}
                    <div className="border-2 border-slate-800 rounded-2xl overflow-hidden mb-5 shadow-md">
                      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.15em]">Total Gaji Bersih yang Diterima</p>
                      </div>
                      <div className="bg-white px-4 py-4 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold">{mNames[selectedPayslip.period_month - 1]} {selectedPayslip.period_year} · {selectedPayslip.period_label}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{d.nama || profile?.full_name}</p>
                        </div>
                        <p className="text-xl font-black text-slate-900">{fmt(d.total_gaji_bersih) || '-'}</p>
                      </div>
                    </div>

                    {/* ═══ INFO PEMBAYARAN ═══ */}
                    {(d.no_rekening || d.no_whatsapp) && (
                      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-2">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-200">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Informasi Pembayaran</p>
                        </div>
                        {d.no_rekening && (
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-blue-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">No. Rekening</p>
                              <p className="text-xs font-extrabold text-gray-800 tracking-wide">{d.no_rekening}</p>
                            </div>
                          </div>
                        )}
                        {d.no_whatsapp && (
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-green-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">No. WhatsApp</p>
                              <p className="text-xs font-extrabold text-gray-800">{d.no_whatsapp}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer dokumen */}
                    <p className="text-center text-[9px] text-gray-300 font-bold tracking-widest mt-3 pb-1">— DOKUMEN INI SAH TANPA TANDA TANGAN —</p>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* PROCESSING ATTENDANCE LOADING OVERLAY */}
      {actionLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full border border-slate-100 shadow-2xl text-center animate-scale-up text-slate-800">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Memproses Presensi...</h3>
            <p className="text-xs font-semibold text-slate-500">
              Mengambil koordinat GPS dan mengirimkan data absensi ke server. Mohon tunggu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
