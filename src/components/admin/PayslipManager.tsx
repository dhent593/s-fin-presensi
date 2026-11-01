import React from 'react';
import { formatWibDate } from '@/lib/date';

interface PayslipPeriodItem {
  period_month: number;
  period_year: number;
  period_label: string;
  count: number;
  uploaded_at: string;
}

interface PayslipManagerProps {
  payslipFeedback: { success: boolean; message: string } | null;
  payslipMonth: number;
  setPayslipMonth: (m: number) => void;
  payslipYear: number;
  setPayslipYear: (y: number) => void;
  payslipLabel: string;
  setPayslipLabel: (l: string) => void;
  payslipImportLoading: boolean;
  onImportPayslipExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  payslipImportProgress: { current: number; total: number } | null;
  payslipLoading: boolean;
  payslipList: PayslipPeriodItem[];
  onRefreshPayslips: () => void;
  deletingPeriod: { month: number; year: number; label: string } | null;
  setDeletingPeriod: (val: { month: number; year: number; label: string } | null) => void;
  onDeletePeriodPayslips: (month: number, year: number, label: string) => void;
}

export const PayslipManager: React.FC<PayslipManagerProps> = ({
  payslipFeedback,
  payslipMonth,
  setPayslipMonth,
  payslipYear,
  setPayslipYear,
  payslipLabel,
  setPayslipLabel,
  payslipImportLoading,
  onImportPayslipExcel,
  payslipImportProgress,
  payslipLoading,
  payslipList,
  onRefreshPayslips,
  deletingPeriod,
  setDeletingPeriod,
  onDeletePeriodPayslips,
}) => {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <div className="p-3.5 md:p-5 max-w-6xl w-full space-y-3.5 md:space-y-4 flex-1 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 md:p-4">
        <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1">Upload Slip Gaji Karyawan</h3>
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          Upload file Excel laporan gaji. Sistem akan otomatis mencocokkan NIK karyawan dan menyimpan
          slip gaji masing-masing.
        </p>

        {/* Feedback */}
        {payslipFeedback && (
          <div
            className={`p-4 rounded-xl mb-5 text-sm font-bold border ${
              payslipFeedback.success
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}
          >
            {payslipFeedback.message}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          {/* Pilih Bulan */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              Periode Bulan
            </label>
            <select
              value={payslipMonth}
              onChange={(e) => setPayslipMonth(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Tahun */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              Tahun
            </label>
            <select
              value={payslipYear}
              onChange={(e) => setPayslipYear(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Label */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              Periode
            </label>
            <select
              value={payslipLabel}
              onChange={(e) => setPayslipLabel(e.target.value)}
              className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="Awal">Awal (1–15)</option>
              <option value="Akhir">Akhir (16–31)</option>
            </select>
          </div>

          {/* Upload Button */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              File Excel Gaji
            </label>
            <label
              className={`hover-lift flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-md cursor-pointer ${
                payslipImportLoading ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              {payslipImportLoading ? 'Memproses...' : 'Upload Excel (.xlsx)'}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onImportPayslipExcel}
                disabled={payslipImportLoading}
              />
            </label>
          </div>
        </div>

        {/* Progress Bar */}
        {payslipImportProgress && (
          <div className="mt-5">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
              <span>Memproses karyawan...</span>
              <span>
                {payslipImportProgress.current} / {payslipImportProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (payslipImportProgress.current / payslipImportProgress.total) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Daftar Periode yang Sudah Diupload */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Riwayat Upload Slip Gaji</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Klik ikon hapus untuk menghapus seluruh slip gaji pada periode tertentu.
            </p>
          </div>
          <button
            onClick={onRefreshPayslips}
            className="text-xs font-bold text-orange-500 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {payslipLoading ? (
          <div className="py-10 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-400">Memuat data...</p>
          </div>
        ) : payslipList.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-8 h-8 text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-400">Belum ada slip gaji yang diupload.</p>
            <p className="text-xs text-gray-300 mt-1">Upload file Excel gaji di atas untuk mulai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payslipList.map((period) => (
              <div
                key={`${period.period_year}_${period.period_month}_${period.period_label}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-gray-900">
                      Slip Gaji {monthNames[period.period_month - 1]} {period.period_year}{' '}
                      <span className="text-orange-500">— {period.period_label}</span>
                    </p>
                    <p className="text-xs text-gray-400 font-bold">
                      {period.count} karyawan · Diupload{' '}
                      {formatWibDate(period.uploaded_at, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setDeletingPeriod({
                      month: period.period_month,
                      year: period.period_year,
                      label: period.period_label,
                    })
                  }
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                  title="Hapus semua slip periode ini"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Delete Period Modal */}
      {deletingPeriod && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center border border-gray-100">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-7 h-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Hapus Slip Gaji?</h3>
            <p className="text-sm text-gray-500 font-semibold mb-6 leading-relaxed">
              Seluruh slip gaji periode{' '}
              <strong className="text-gray-800">
                {monthNames[deletingPeriod.month - 1]} {deletingPeriod.year}
              </strong>{' '}
              <span className="text-orange-600 font-bold">({deletingPeriod.label})</span> akan
              dihapus permanen. Karyawan tidak dapat melihat slip ini lagi.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeletingPeriod(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition cursor-pointer text-sm"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  onDeletePeriodPayslips(
                    deletingPeriod.month,
                    deletingPeriod.year,
                    deletingPeriod.label
                  )
                }
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition cursor-pointer shadow-lg shadow-red-500/20 text-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

