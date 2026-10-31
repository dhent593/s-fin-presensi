import React from 'react';
import Image from 'next/image';
import { Profile } from '@/types';

export type AdminTab =
  | 'dashboard'
  | 'employees'
  | 'recap'
  | 'geofencing'
  | 'payslip'
  | 'notifications'
  | 'leave';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
  adminProfile: Profile | null;
  onLogoutClick: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileSidebarOpen,
  onCloseMobileSidebar,
  adminProfile,
  onLogoutClick,
}) => {
  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'dashboard',
      label: 'Dashboard Monitor',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className={`w-5 h-5 transition-transform duration-200 ${
            activeTab === 'dashboard' ? 'text-orange-500 scale-110' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      ),
    },
    {
      id: 'employees',
      label: 'Kelola Karyawan',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className={`w-5 h-5 transition-transform duration-200 ${
            activeTab === 'employees' ? 'text-orange-500 scale-110' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      ),
    },
    {
      id: 'recap',
      label: 'Rekap Bulanan',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className={`w-5 h-5 transition-transform duration-200 ${
            activeTab === 'recap' ? 'text-orange-500 scale-110' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      ),
    },
    {
      id: 'geofencing',
      label: 'Pengaturan Kantor',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className={`w-5 h-5 transition-transform duration-200 ${
            activeTab === 'geofencing' ? 'text-orange-500 scale-110' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774a1.125 1.125 0 01.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738a1.125 1.125 0 01-.12 1.45l-.774.773a1.125 1.125 0 01-1.45.12l-.737-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.93l-.15.893c-.09.543-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.149-.894c-.07-.425-.383-.765-.78-.93-.398-.165-.854-.143-1.204.107l-.738.527a1.125 1.125 0 01-1.45-.12l-.774-.772a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.774a1.125 1.125 0 011.45-.12l.738.527c.35.25.806.272 1.204.107.397-.165.71-.505.78-.93l.15-.893z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'payslip',
      label: 'Kelola Slip Gaji',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className={`w-5 h-5 transition-transform duration-200 ${
            activeTab === 'payslip' ? 'text-orange-500 scale-110' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Kelola Notifikasi',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className={`w-5 h-5 transition-transform duration-200 ${
            activeTab === 'notifications' ? 'text-orange-500 scale-110' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5"
          />
        </svg>
      ),
    },
    {
      id: 'leave',
      label: 'Kelola Cuti & Izin',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className={`w-5 h-5 transition-transform duration-200 ${
            activeTab === 'leave' ? 'text-orange-500 scale-110' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* MOBILE SIDEBAR BACKDROP OVERLAY */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobileSidebar}
        aria-hidden="true"
      />

      {/* SIDEBAR ASIDE */}
      <aside
        style={{ willChange: 'transform' }}
        className={`w-72 bg-white text-slate-800 flex flex-col justify-between border-r border-slate-100 shadow-xl fixed md:relative inset-y-0 left-0 z-40 md:w-64 md:translate-x-0 md:flex md:shadow-sm
          transition-[transform,box-shadow] duration-[350ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          isMobileSidebarOpen ? 'translate-x-0 flex' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header Logo */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-100">
            <Image
              src="/favicon.png"
              alt="Great Attendance Logo"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl shadow-md shadow-orange-500/10"
            />
            <div>
              <h1 className="font-black tracking-wide leading-tight text-sm text-slate-900">
                Great Attendance
              </h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">
                Admin Panel
              </p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobileSidebar();
                  }}
                  className={`relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm text-left
                    transition-all duration-200 ease-out cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin Profile Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-orange-500/10">
              {adminProfile?.full_name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="text-xs font-black block text-slate-800">
                {adminProfile?.full_name || 'Admin'}
              </p>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">
                {adminProfile?.role || 'Super Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogoutClick}
            title="Keluar"
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition duration-200 cursor-pointer"
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
      </aside>
    </>
  );
};

