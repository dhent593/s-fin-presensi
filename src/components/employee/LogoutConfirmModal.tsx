import React from 'react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
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
        <h3 className="text-xl font-black text-slate-900 mb-2">Keluar Aplikasi?</h3>
        <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
          Apakah Anda yakin ingin keluar dari akun Anda?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
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

