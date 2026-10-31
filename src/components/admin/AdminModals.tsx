import React from 'react';
import { Profile } from '@/types';

export const AdminLogoutModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl animate-scale-up text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Keluar Panel Admin?</h3>
        <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
          Apakah Anda yakin ingin keluar dari panel admin?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-red-500/25"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );
};

export const DeleteEmployeeModal: React.FC<{
  employee: Profile | null;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ employee, onClose, onConfirm }) => {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl animate-scale-up text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Hapus Karyawan?</h3>
        <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
          Apakah Anda yakin ingin menghapus karyawan{' '}
          <strong className="text-slate-800">{employee.full_name}</strong> (NIK: {employee.nik})?
          Semua data riwayat absensi karyawan ini juga akan dihapus permanen.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-red-500/25"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

export const ResetEmployeesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl text-center animate-scale-up">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Reset Semua Karyawan?</h3>
        <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
          Tindakan ini akan{' '}
          <strong className="text-red-600">MENGHAPUS SEMUA DATA KARYAWAN</strong> (kecuali akun
          Admin Anda) serta menghapus seluruh riwayat absensi bulanan mereka secara permanen!
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-red-500/25"
          >
            Ya, Reset Semua
          </button>
        </div>
      </div>
    </div>
  );
};

