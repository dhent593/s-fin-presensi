import React from 'react';
import { AttendanceLog, GeofenceSettings } from '@/types';
import { formatWibTime } from '@/lib/date';

interface AttendanceActionCardProps {
  todayLog: AttendanceLog | null;
  officeSettings: GeofenceSettings | null;
  geofenceStatus: 'inside' | 'outside' | 'error' | 'loading';
  geofenceText: string;
  actionLoading: boolean;
  breakActionLoading: boolean;
  onConfirmAttendance: (type: 'Masuk' | 'Pulang') => void;
  onConfirmBreak: (type: 'IstirahatMulai' | 'IstirahatSelesai') => void;
}

export const AttendanceActionCard: React.FC<AttendanceActionCardProps> = ({
  todayLog,
  officeSettings,
  geofenceStatus,
  geofenceText,
  actionLoading,
  breakActionLoading,
  onConfirmAttendance,
  onConfirmBreak,
}) => {
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 mb-6 text-center animate-slide-up">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
        TEKAN TOMBOL DI BAWAH UNTUK ABSEN
      </p>

      {/* Grid Tombol Besar */}
      <div className="grid grid-cols-2 gap-4">
        {/* Tombol Masuk */}
        <button
          onClick={() => onConfirmAttendance('Masuk')}
          disabled={actionLoading || breakActionLoading}
          className="hover-lift flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 disabled:opacity-50 disabled:scale-100 text-white rounded-3xl p-6 transition-all duration-300 shadow-lg shadow-orange-500/20 cursor-pointer"
        >
          <div className="bg-white/20 p-3 rounded-2xl mb-3 shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="3"
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-md font-black tracking-wide">ABSEN MASUK</span>
        </button>

        {/* Tombol Keluar */}
        <button
          onClick={() => onConfirmAttendance('Pulang')}
          disabled={actionLoading || breakActionLoading}
          className="hover-lift flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 active:scale-95 disabled:opacity-50 disabled:scale-100 text-white rounded-3xl p-6 transition-all duration-300 shadow-lg shadow-slate-700/20 cursor-pointer"
        >
          <div className="bg-white/20 p-3 rounded-2xl mb-3 shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="3"
              stroke="currentColor"
              className="w-8 h-8"
            >
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
        const hasBreakEnd = Boolean(todayLog.break_end);
        if (hasBreakEnd) return null;
        const isResting = Boolean(todayLog.break_start);
        return (
          <button
            onClick={() => onConfirmBreak(isResting ? 'IstirahatSelesai' : 'IstirahatMulai')}
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
              {isResting
                ? `Mulai: ${formatWibTime(todayLog.break_start)} WIB`
                : `${officeSettings.break_start_time} – ${officeSettings.break_end_time} WIB`}
            </span>
          </button>
        );
      })()}

      {/* Indikator Status Lokasi Geofencing */}
      <div className="mt-5">
        {geofenceStatus === 'inside' && (
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-extrabold border border-emerald-100 shadow-sm animate-fade-in">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {geofenceText}
          </div>
        )}
        {geofenceStatus === 'outside' && (
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-extrabold border border-amber-100 shadow-sm animate-fade-in">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            {geofenceText}
          </div>
        )}
        {geofenceStatus === 'loading' && (
          <div className="inline-flex items-center gap-2 bg-slate-50 text-slate-500 px-4 py-2 rounded-full text-xs font-extrabold border border-slate-100 shadow-sm">
            <span className="w-2 h-2 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            {geofenceText}
          </div>
        )}
        {geofenceStatus === 'error' && (
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-xs font-extrabold border border-red-100 shadow-sm animate-fade-in">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            {geofenceText}
          </div>
        )}
      </div>
    </div>
  );
};

