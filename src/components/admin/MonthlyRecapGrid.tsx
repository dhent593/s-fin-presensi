import React from 'react';
import { Profile, AttendanceLog } from '@/types';
import { formatWibTime } from '@/lib/date';

interface MonthlyRecapGridProps {
  recapMonth: number;
  setRecapMonth: (m: number) => void;
  recapYear: number;
  setRecapYear: (y: number) => void;
  recapStartDay: number;
  setRecapStartDay: (d: number) => void;
  recapEndDay: number;
  setRecapEndDay: (d: number) => void;
  onExportRecapXLSX: () => void;
  onOpenResetRecapModal: () => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  sortBy: 'newest' | 'excel' | 'name' | 'nik';
  setSortBy: (s: 'newest' | 'excel' | 'name' | 'nik') => void;
  recapLoading: boolean;
  isPending: boolean;
  daysInSelectedMonth: number[];
  processedEmployees: Profile[];
  employeeRecapStats: Map<
    string,
    { countInRange: number; countTotal: number; totalLateMinutes: number; totalOvertimeMinutes: number }
  >;
  recapLogMap: Map<string, AttendanceLog>;
  sundaySet: Set<number>;
  formatLateMinutes: (mins: number) => string;
  formatOvertimeMinutes: (mins: number) => string;
  onEditCellClick: (emp: Profile, day: number, log?: AttendanceLog) => void;
  startTransition: (callback: () => void) => void;
  // Modals state & handlers
  showResetRecapModal: boolean;
  setShowResetRecapModal: (v: boolean) => void;
  resetRecapLoading: boolean;
  onResetMonthlyRecap: () => void;
  editingCell: { employee: Profile; day: number; log?: AttendanceLog } | null;
  setEditingCell: (cell: { employee: Profile; day: number; log?: AttendanceLog } | null) => void;
  editCheckIn: string;
  setEditCheckIn: (v: string) => void;
  editCheckOut: string;
  setEditCheckOut: (v: string) => void;
  editStatus: string;
  setEditStatus: (v: string) => void;
  isSavingEdit: boolean;
  onSaveAttendanceEdit: () => void;
  onDeleteAttendanceRecord: () => void;
}

export const MonthlyRecapGrid: React.FC<MonthlyRecapGridProps> = ({
  recapMonth,
  setRecapMonth,
  recapYear,
  setRecapYear,
  recapStartDay,
  setRecapStartDay,
  recapEndDay,
  setRecapEndDay,
  onExportRecapXLSX,
  onOpenResetRecapModal,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  recapLoading,
  isPending,
  daysInSelectedMonth,
  processedEmployees,
  employeeRecapStats,
  recapLogMap,
  sundaySet,
  formatLateMinutes,
  formatOvertimeMinutes,
  onEditCellClick,
  startTransition,
  showResetRecapModal,
  setShowResetRecapModal,
  resetRecapLoading,
  onResetMonthlyRecap,
  editingCell,
  setEditingCell,
  editCheckIn,
  setEditCheckIn,
  editCheckOut,
  setEditCheckOut,
  editStatus,
  setEditStatus,
  isSavingEdit,
  onSaveAttendanceEdit,
  onDeleteAttendanceRecord,
}) => {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <div className="p-4 md:p-8 flex-1 flex flex-col animate-fade-in w-full overflow-x-hidden">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 mb-4">
          <div>
            <h3 className="text-sm md:text-lg font-bold text-gray-800">
              Rekap Bulanan Kehadiran Karyawan
            </h3>
            <p className="text-[10px] md:text-xs text-gray-400 leading-relaxed mt-1">
              Arahkan kursor ke tanda centang/silang untuk melihat detail jam kerja. Klik kotak untuk koreksi manual.
            </p>
          </div>

          {/* Baris 1: Selector Bulan, Tahun, Rentang, Tombol Aksi */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={recapMonth}
              onChange={(e) => {
                const newMonth = Number(e.target.value);
                startTransition(() => {
                  setRecapMonth(newMonth);
                  const lastDay = new Date(recapYear, newMonth + 1, 0).getDate();
                  setRecapStartDay(1);
                  setRecapEndDay(lastDay);
                });
              }}
              className="bg-gray-50 border border-gray-200 px-2.5 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={recapYear}
              onChange={(e) => {
                const newYear = Number(e.target.value);
                startTransition(() => {
                  setRecapYear(newYear);
                  const lastDay = new Date(newYear, recapMonth + 1, 0).getDate();
                  setRecapStartDay(1);
                  setRecapEndDay(lastDay);
                });
              }}
              className="bg-gray-50 border border-gray-200 px-2.5 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Rentang Tanggal */}
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-2.5 py-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-3 h-3 text-orange-500 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wide">
                Tgl
              </span>
              <select
                value={recapStartDay}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRecapStartDay(v);
                  if (v > recapEndDay) setRecapEndDay(v);
                }}
                className="bg-transparent border-none text-xs font-black text-orange-700 focus:outline-none cursor-pointer w-10"
              >
                {Array.from(
                  { length: new Date(recapYear, recapMonth + 1, 0).getDate() },
                  (_, i) => i + 1
                ).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-[10px] font-extrabold text-orange-500">s/d</span>
              <select
                value={recapEndDay}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRecapEndDay(v);
                  if (v < recapStartDay) setRecapStartDay(v);
                }}
                className="bg-transparent border-none text-xs font-black text-orange-700 focus:outline-none cursor-pointer w-10"
              >
                {Array.from(
                  { length: new Date(recapYear, recapMonth + 1, 0).getDate() },
                  (_, i) => i + 1
                ).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {(recapStartDay !== 1 ||
                recapEndDay !== new Date(recapYear, recapMonth + 1, 0).getDate()) && (
                <button
                  type="button"
                  onClick={() => {
                    setRecapStartDay(1);
                    setRecapEndDay(new Date(recapYear, recapMonth + 1, 0).getDate());
                  }}
                  className="ml-0.5 text-orange-400 hover:text-orange-600 transition text-[10px] font-black cursor-pointer"
                  title="Reset ke bulan penuh"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={onExportRecapXLSX}
              className="hover-lift bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              Ekspor (.XLSX)
            </button>

            <button
              onClick={onOpenResetRecapModal}
              className="hover-lift bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-md cursor-pointer flex items-center gap-2"
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
              Reset Bulan Ini
            </button>
          </div>
        </div>

        {/* Filter dan Search Bar Rekap */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="sm:col-span-2">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
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
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari nama atau NIK karyawan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 pl-10 pr-10 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition-all shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 font-extrabold text-xs cursor-pointer focus:outline-none"
                >
                  Batal
                </button>
              )}
            </div>
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'excel' | 'name' | 'nik')}
              className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
            >
              <option value="newest">Urutan: Terbaru</option>
              <option value="excel">Urutan: Sesuai Excel</option>
              <option value="name">Urutan: Nama (A - Z)</option>
              <option value="nik">Urutan: NIK (Terkecil)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABEL GRID BULANAN */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden flex-1 flex flex-col">
        {recapLoading || isPending ? (
          <div className="py-20 flex flex-col items-center justify-center flex-1">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-gray-500">Memuat data rekap...</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[550px] w-full flex-1 border border-slate-100/80 rounded-2xl shadow-inner bg-slate-50/20">
            <table className="min-w-max w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_rgba(241,245,249,1)]">
                <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-4 sticky left-0 top-0 bg-white z-30 border-r border-gray-100 rounded-l-xl w-[180px]">
                    Nama Karyawan
                  </th>
                  <th className="py-4 px-2 text-center sticky left-[180px] top-0 bg-slate-50 border-r border-gray-100 z-30 w-[90px]">
                    Hadir<br />
                    <span className="text-[9px] font-bold text-orange-400 normal-case">
                      {recapStartDay}–
                      {Math.min(
                        recapEndDay,
                        new Date(recapYear, recapMonth + 1, 0).getDate()
                      )}
                    </span>
                  </th>
                  <th className="py-4 px-2 text-center sticky left-[270px] top-0 bg-slate-50 border-r border-gray-100 z-30 w-[60px]">
                    Total
                  </th>
                  <th className="py-4 px-2 text-center sticky left-[330px] top-0 bg-slate-50 border-r border-gray-100 z-30 w-[65px]">
                    Terlambat
                  </th>
                  <th className="py-4 px-2 text-center sticky left-[395px] top-0 bg-slate-50 border-r border-gray-100 z-30 w-[65px]">
                    Lembur
                  </th>
                  {daysInSelectedMonth.map((day) => (
                    <th
                      key={day}
                      className="py-4 px-2 text-center w-[75px] text-[10px] sticky top-0 bg-slate-50/90 z-20"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-50 font-bold text-gray-700">
                {processedEmployees.filter((p) => p.role === 'user').length === 0 ? (
                  <tr>
                    <td colSpan={36} className="py-12 text-center text-gray-400 font-bold">
                      {searchTerm
                        ? 'Tidak ditemukan karyawan yang cocok.'
                        : 'Belum ada data karyawan terdaftar.'}
                    </td>
                  </tr>
                ) : (
                  processedEmployees
                    .filter((p) => p.role === 'user')
                    .map((emp) => {
                      const stats = employeeRecapStats.get(emp.id);
                      if (!stats) return null;
                      const {
                        countInRange,
                        countTotal,
                        totalLateMinutes,
                        totalOvertimeMinutes,
                      } = stats;
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50/50">
                          {/* Kolom Nama Pinned */}
                          <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] w-[180px]">
                            <p className="font-extrabold text-gray-900 text-xs">{emp.full_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">NIK: {emp.nik}</p>
                          </td>

                          {/* Kolom Ringkasan Kehadiran Pinned */}
                          <td className="py-3 px-2 sticky left-[180px] bg-slate-50 z-10 border-r border-gray-100 text-center font-black text-emerald-600 text-xs w-[90px]">
                            {countInRange} Hari
                          </td>
                          <td className="py-3 px-2 sticky left-[270px] bg-slate-50 z-10 border-r border-gray-100 text-center font-black text-orange-600 text-xs w-[60px]">
                            {countTotal} Hari
                          </td>
                          <td className="py-3 px-2 sticky left-[330px] bg-slate-50 z-10 border-r border-gray-100 text-center font-black text-red-500 text-xs w-[65px]">
                            {formatLateMinutes(totalLateMinutes)}
                          </td>
                          <td className="py-3 px-2 sticky left-[395px] bg-slate-50 z-10 border-r border-gray-100 text-center font-black text-purple-600 text-xs w-[65px]">
                            {formatOvertimeMinutes(totalOvertimeMinutes)}
                          </td>

                          {/* Kolom Tanggal */}
                          {daysInSelectedMonth.map((day) => {
                            const log = recapLogMap.get(`${emp.id}_${day}`);
                            const isSunday = sundaySet.has(day);

                            return (
                              <td
                                key={day}
                                onClick={() => onEditCellClick(emp, day, log)}
                                className="py-2.5 px-1.5 text-center align-middle w-[75px] cursor-pointer hover:bg-orange-50/50"
                                title="Klik untuk tambah/edit absensi"
                              >
                                {log ? (
                                  (() => {
                                    const isLeave = ['Izin', 'Sakit', 'Cuti'].includes(log.status);
                                    const isLate = log.status === 'Terlambat';

                                    const tooltip = (
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-slate-900 text-white text-left p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-30 text-[10px] space-y-1 font-bold">
                                        <p className="text-orange-400 font-extrabold">
                                          Absensi {day} {monthNames[recapMonth]}
                                        </p>
                                        <p>
                                          Masuk:{' '}
                                          <span className="text-white">
                                            {formatWibTime(log.check_in)} WIB
                                          </span>{' '}
                                          ({log.status})
                                        </p>
                                        <p>
                                          Pulang:{' '}
                                          <span className="text-white">
                                            {log.check_out
                                              ? `${formatWibTime(log.check_out)} WIB`
                                              : '--:--'}
                                          </span>
                                        </p>
                                        {log.break_start ? (
                                          <p>
                                            Istirahat:{' '}
                                            <span className="text-blue-300">
                                              {formatWibTime(log.break_start)}
                                              {log.break_end
                                                ? ` – ${formatWibTime(log.break_end)}`
                                                : ''}
                                            </span>
                                          </p>
                                        ) : null}
                                      </div>
                                    );

                                    return (
                                      <div className="relative group inline-block">
                                        {isLeave ? (
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black">
                                            {log.status[0]}
                                          </span>
                                        ) : isLate ? (
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-700 text-[10px] font-black">
                                            T
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black">
                                            ✓
                                          </span>
                                        )}
                                        {tooltip}
                                      </div>
                                    );
                                  })()
                                ) : isSunday ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-300 text-[10px] font-bold">
                                    -
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-red-50 text-red-300 text-[10px] font-bold">
                                    ✕
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRM RESET MONTHLY RECAP MODAL */}
      {showResetRecapModal && (
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
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">Reset Data Absensi?</h3>
            <p className="text-xs font-bold text-orange-500 mb-3">
              {monthNames[recapMonth]} {recapYear}
            </p>
            <p className="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
              Tindakan ini akan{' '}
              <strong className="text-red-600">MENGHAPUS SEMUA DATA ABSENSI</strong> pada bulan
              tersebut secara permanen. Pastikan Anda sudah{' '}
              <strong className="text-slate-700">backup ke Excel</strong> sebelum melanjutkan.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowResetRecapModal(false)}
                disabled={resetRecapLoading}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onResetMonthlyRecap}
                disabled={resetRecapLoading}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-red-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetRecapLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{' '}
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ATTENDANCE CORRECTION MODAL */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">Koreksi Absensi Manual</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  Karyawan:{' '}
                  <span className="text-slate-800">{editingCell.employee.full_name}</span> (NIK:{' '}
                  {editingCell.employee.nik})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none p-2 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Info Tanggal */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-bold">
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
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Tanggal Koreksi
                  </p>
                  <p className="text-sm font-extrabold text-slate-800">
                    {editingCell.day} {monthNames[recapMonth]} {recapYear}
                  </p>
                </div>
              </div>

              {/* Form Input Jam Masuk & Pulang */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Jam Masuk (WIB)
                  </label>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Jam Pulang (WIB)
                  </label>
                  <input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    placeholder="--:--"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 shadow-sm"
                  />
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    Kosongkan jika belum absen pulang
                  </p>
                </div>
              </div>

              {/* Status Absensi */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Status Kehadiran
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
                >
                  <option value="Tepat Waktu">Tepat Waktu (Hadir)</option>
                  <option value="Terlambat">Terlambat (Hadir)</option>
                  <option value="Sudah Pulang">Sudah Pulang (Hadir Lengkap)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {editingCell.log ? (
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={onDeleteAttendanceRecord}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer text-xs disabled:opacity-50 border border-red-100 flex items-center justify-center gap-1"
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
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer text-xs"
                >
                  Batal
                </button>
              )}

              {editingCell.log && (
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer text-xs"
                >
                  Batal
                </button>
              )}

              <button
                type="button"
                disabled={isSavingEdit}
                onClick={onSaveAttendanceEdit}
                className={`text-white font-bold py-3.5 rounded-2xl transition active:scale-95 cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-lg ${
                  editingCell.log
                    ? 'col-span-1 bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                    : 'col-span-2 bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                }`}
              >
                {isSavingEdit ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

