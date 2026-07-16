"use client";

import { useEffect, useState } from 'react';
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
}

export default function Home() {
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
  const [attendanceConfirm, setAttendanceConfirm] = useState<{ type: 'Masuk' | 'Pulang' } | null>(null);

  // History logs
  const [history, setHistory] = useState<AttendanceLog[]>([]);

  // Office settings (for lateness calculation)
  const [officeSettings, setOfficeSettings] = useState<{ work_start_time: string; saturday_work_start_time: string } | null>(null);

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
        .select('*')
        .eq('user_id', user.id)
        .order('check_in', { ascending: false })
        .limit(7);

      if (error) throw error;
      setHistory((data || []) as AttendanceLog[]);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchOfficeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('geofence_settings')
        .select('work_start_time, saturday_work_start_time')
        .eq('id', 1)
        .single();
      if (!error && data) {
        setOfficeSettings(data);
      }
    } catch (err) {
      console.error('Error fetching office settings:', err);
    }
  };

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
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-5 shadow-lg shadow-orange-500/10"></div>
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
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col justify-between relative pb-20 shadow-2xl border-x border-slate-150 animate-fade-in text-slate-800">
      
      {/* HEADER */}
      <header className="bg-gradient-to-b from-orange-500 to-orange-600 text-white px-6 pt-10 pb-14 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        {/* Glow effects inside header */}
        <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <p className="text-orange-100 text-sm font-semibold">Selamat Bekerja,</p>
            <h1 className="text-2xl font-black tracking-wide leading-tight">{profile?.full_name || 'Karyawan'}</h1>
            <p className="text-xs text-orange-200 mt-0.5 font-bold">NIK: {profile?.nik || '-'}</p>
          </div>
          {/* Tombol Keluar */}
          <button 
            onClick={() => setShowLogoutModal(true)}
            title="Keluar Aplikasi"
            className="bg-white/10 hover:bg-white/20 active:scale-90 p-3 rounded-2xl transition-all duration-300 shadow-md backdrop-blur-md border border-white/10 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
        
        {/* Widget Waktu & Tanggal */}
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-5 text-center border border-white/20 shadow-inner relative z-10">
          <p className="text-4xl font-black tracking-wider drop-shadow-sm">{timeString}</p>
          <p className="text-xs font-black text-orange-100 mt-1.5 uppercase tracking-wider">{dateString}</p>
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <main className="px-6 -mt-8 flex-1 relative z-20">
        
        {/* AREA KARTU ABSENSI UTAMA */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 mb-6 text-center animate-slide-up">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">TEKAN TOMBOL DI BAWAH UNTUK ABSEN</p>
          
          {/* Grid Tombol Besar */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tombol Masuk */}
            <button 
              onClick={() => setAttendanceConfirm({ type: 'Masuk' })}
              disabled={actionLoading}
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
              disabled={actionLoading}
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

        {/* RIWAYAT ABSENSI 7 HARI TERAKHIR */}
        <div className="mb-6 animate-slide-up [animation-delay:150ms]">
          <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-3.5 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Riwayat Absen 7 Hari Terakhir
          </h3>
          
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
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* FOOTER INFO KARYAWAN */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
        Sistem Presensi Pabrik v1.0
      </footer>

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
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full border border-slate-100 shadow-2xl animate-scale-up text-center text-slate-800">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Konfirmasi Lokasi</h3>
            <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
              Apakah Anda yakin sudah ada di area pabrik untuk melakukan <span className="text-orange-500">Absen {attendanceConfirm.type}</span>?
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
                  await triggerAttendance(type);
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-orange-500/25 text-xs"
              >
                Ya, Yakin
              </button>
            </div>
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
