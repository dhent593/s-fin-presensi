import React from 'react';
import { Profile } from '@/types';

interface HeaderGreetingProps {
  profile: Profile | null;
  onOpenPusatInformasi: () => void;
  onOpenLogout: () => void;
}

export const HeaderGreeting: React.FC<HeaderGreetingProps> = ({
  profile,
  onOpenPusatInformasi,
  onOpenLogout,
}) => {
  return (
    <div className="shrink-0 bg-orange-500 text-white px-6 pt-8 pb-4 flex justify-between items-center z-30 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <p className="text-orange-100 text-xs font-semibold">Selamat Bekerja,</p>
        <h1 className="text-xl font-black tracking-wide leading-tight">
          {profile?.full_name || 'Karyawan'}
        </h1>
        <p className="text-[10px] text-orange-200 mt-0.5 font-bold uppercase">
          NIK: {profile?.nik || '-'}
        </p>
      </div>
      <div className="flex gap-2 relative z-10">
        {/* Tombol Notifikasi Slip Gaji */}
        <button
          onClick={onOpenPusatInformasi}
          title="Notifikasi Slip Gaji"
          className="bg-white/10 hover:bg-white/20 active:scale-90 p-2.5 rounded-xl transition-all duration-300 shadow-md backdrop-blur-md border border-white/10 cursor-pointer relative"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-orange-500 animate-pulse" />
        </button>

        {/* Tombol Keluar */}
        <button
          onClick={onOpenLogout}
          title="Keluar Aplikasi"
          className="bg-white/10 hover:bg-white/20 active:scale-90 p-2.5 rounded-xl transition-all duration-300 shadow-md backdrop-blur-md border border-white/10 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

