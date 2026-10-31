import React from 'react';

interface AttendanceConfirmModalProps {
  confirmState: { type: 'Masuk' | 'Pulang' | 'IstirahatMulai' | 'IstirahatSelesai' } | null;
  onCancel: () => void;
  onConfirm: (type: 'Masuk' | 'Pulang' | 'IstirahatMulai' | 'IstirahatSelesai') => void;
}

export const AttendanceConfirmModal: React.FC<AttendanceConfirmModalProps> = ({
  confirmState,
  onCancel,
  onConfirm,
}) => {
  if (!confirmState) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl p-8 shadow-2xl text-center w-full max-w-sm animate-scale-up border border-slate-100 relative overflow-hidden text-slate-800">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-black text-slate-900 mb-2">Konfirmasi Absensi</h3>
        <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
          {confirmState.type === 'IstirahatMulai' && 'Anda akan mencatat waktu mulai istirahat sekarang.'}
          {confirmState.type === 'IstirahatSelesai' && 'Anda akan mencatat waktu selesai istirahat sekarang.'}
          {(confirmState.type === 'Masuk' || confirmState.type === 'Pulang') && (
            <>
              Apakah Anda yakin sudah ada di area pabrik untuk melakukan{' '}
              <span className="text-orange-500">Absen {confirmState.type}</span>?
            </>
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition active:scale-95 cursor-pointer text-xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(confirmState.type)}
            className={`w-full text-white font-bold py-3 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg text-xs ${
              confirmState.type === 'IstirahatMulai'
                ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25'
                : confirmState.type === 'IstirahatSelesai'
                ? 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/25'
                : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
            }`}
          >
            Ya, Catat
          </button>
        </div>
      </div>
    </div>
  );
};

