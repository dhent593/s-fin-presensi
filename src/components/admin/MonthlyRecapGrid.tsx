import React, { useState, useMemo } from 'react';
import { Profile, AttendanceLog } from '@/types';
import { formatWibTime, getWibDate } from '@/lib/date';

interface MonthlyRecapGridProps {
  recapMonth: number;
  onMonthChange: (m: number) => void;
  recapYear: number;
  onYearChange: (y: number) => void;
  recapStartDay: number;
  setRecapStartDay: (d: number) => void;
  recapEndDay: number;
  setRecapEndDay: (d: number) => void;
  onExportRecapXLSX: () => void;
  exportRecapLoading?: boolean;
  onRefreshRecap?: () => void;
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
  onMonthChange,
  recapYear,
  onYearChange,
  recapStartDay,
  setRecapStartDay,
  recapEndDay,
  setRecapEndDay,
  onExportRecapXLSX,
  exportRecapLoading = false,
  onRefreshRecap,
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
  const [filterMissingCheckOut, setFilterMissingCheckOut] = useState(false);

  const todayWib = useMemo(() => getWibDate(), []);
  const currentYear = todayWib.getFullYear();
  const currentMonth = todayWib.getMonth();
  const currentDay = todayWib.getDate();

  // Set NIK/ID karyawan yang memiliki minimal 1 presensi tanpa absen pulang di bulan terpilih
  const missingCheckOutEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const log of recapLogMap.values()) {
      if (!['Izin', 'Sakit', 'Cuti'].includes(log.status) && !log.check_out) {
        ids.add(log.user_id);
      }
    }
    return ids;
  }, [recapLogMap]);

  // Daftar karyawan yang difilter jika mode "Belum Pulang" aktif
  const displayedEmployees = useMemo(() => {
    if (!filterMissingCheckOut) return processedEmployees;
    return processedEmployees.filter((emp) => missingCheckOutEmployeeIds.has(emp.id));
  }, [processedEmployees, filterMissingCheckOut, missingCheckOutEmployeeIds]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <div className="p-2 sm:p-3 md:p-5 flex-1 flex flex-col animate-fade-in w-full min-h-0 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* TOOLBAR TERPADU KOMPAK */}
        <div className="p-2 sm:px-3.5 sm:py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-white shrink-0">
          {/* SISI KIRI: Periode, Rentang Tanggal & Pencarian */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Dropdown Bulan & Tahun */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <select
                value={recapMonth}
                onChange={(e) => onMonthChange(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={recapYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Rentang Tanggal Kompak */}
            <div className="flex items-center gap-1 bg-orange-50/70 border border-orange-200/80 rounded-xl px-2 py-1">
              <span className="text-[10px] font-black text-orange-600 uppercase">Tgl</span>
              <select
                value={recapStartDay}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRecapStartDay(v);
                  if (v > recapEndDay) setRecapEndDay(v);
                }}
                className="bg-transparent border-none text-xs font-black text-orange-700 focus:outline-none cursor-pointer w-7 text-center"
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
              <span className="text-[10px] font-black text-orange-400">-</span>
              <select
                value={recapEndDay}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRecapEndDay(v);
                  if (v < recapStartDay) setRecapStartDay(v);
                }}
                className="bg-transparent border-none text-xs font-black text-orange-700 focus:outline-none cursor-pointer w-7 text-center"
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
                  className="text-orange-400 hover:text-orange-600 transition text-[10px] font-black ml-0.5 cursor-pointer"
                  title="Reset ke bulan penuh"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Kolom Pencarian Kompak */}
            <div className="relative flex items-center w-36 sm:w-44 lg:w-52">
              <span className="absolute left-2.5 text-slate-400">
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
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari nama / NIK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-8 pr-7 py-1 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition-all placeholder:font-normal"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 font-extrabold text-xs cursor-pointer focus:outline-none"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* SISI KANAN: Filter Cepat Belum Pulang, Urutkan, Tombol Aksi */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Tombol Filter Cepat Belum Pulang */}
            <button
              type="button"
              onClick={() => setFilterMissingCheckOut(!filterMissingCheckOut)}
              disabled={missingCheckOutEmployeeIds.size === 0}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                filterMissingCheckOut
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : missingCheckOutEmployeeIds.size > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                missingCheckOutEmployeeIds.size > 0
                  ? 'Saring hanya karyawan yang belum absen pulang'
                  : 'Tidak ada karyawan yang belum absen pulang'
              }
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    filterMissingCheckOut ? 'bg-white' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    filterMissingCheckOut ? 'bg-white' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span>Belum Pulang ({missingCheckOutEmployeeIds.size})</span>
              {filterMissingCheckOut && (
                <span className="text-[10px] bg-white/25 rounded-full px-1">✕</span>
              )}
            </button>

            {/* Dropdown Urutkan Kompak */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'excel' | 'name' | 'nik')}
              className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="excel">Sesuai Excel</option>
              <option value="name">Nama (A-Z)</option>
              <option value="nik">NIK</option>
            </select>

            {/* Segarkan */}
            {onRefreshRecap && (
              <button
                type="button"
                onClick={onRefreshRecap}
                disabled={recapLoading}
                className="hover-lift bg-slate-50 hover:bg-slate-100 disabled:opacity-60 text-slate-700 font-bold text-xs py-1 px-2.5 rounded-xl transition cursor-pointer flex items-center gap-1 border border-slate-200"
                title="Segarkan data rekap bulan ini"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className={`w-3.5 h-3.5 ${recapLoading ? 'animate-spin text-orange-500' : 'text-slate-600'}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span className="hidden sm:inline">{recapLoading ? 'Memuat...' : 'Segarkan'}</span>
              </button>
            )}

            {/* Ekspor XLSX */}
            <button
              onClick={onExportRecapXLSX}
              disabled={exportRecapLoading}
              className="hover-lift bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs py-1 px-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              title="Unduh rekap ke file Excel"
            >
              {exportRecapLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden sm:inline">Mengekspor...</span>
                </>
              ) : (
                <>
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
                  <span>Ekspor</span>
                </>
              )}
            </button>

            {/* Reset Bulan Ini */}
            <button
              onClick={onOpenResetRecapModal}
              className="hover-lift bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs py-1 px-2 rounded-xl transition cursor-pointer flex items-center gap-1"
              title="Hapus / Reset semua presensi bulan ini"
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
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              <span className="hidden md:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* TABEL GRID BULANAN (FULL VIEWPORT FLEX-1) */}
        {recapLoading || isPending ? (
          <div className="py-20 flex flex-col items-center justify-center flex-1">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-gray-500">Memuat data rekap...</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto w-full flex-1 min-h-0 bg-slate-50/10">
            <table className="min-w-max w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_rgba(226,232,240,1)]">
                <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-2.5 px-3 sticky left-0 top-0 bg-white z-30 border-r border-slate-100 w-[150px] min-w-[150px] max-w-[150px]">
                    Nama Karyawan
                  </th>
                  <th className="py-2.5 px-1 text-center sticky left-[150px] top-0 bg-slate-50 border-r border-slate-100 z-30 w-[64px] min-w-[64px]">
                    Hadir<br />
                    <span className="text-[9px] font-bold text-orange-500 normal-case">
                      {recapStartDay}–
                      {Math.min(
                        recapEndDay,
                        new Date(recapYear, recapMonth + 1, 0).getDate()
                      )}
                    </span>
                  </th>
                  <th className="py-2.5 px-1 text-center sticky left-[214px] top-0 bg-slate-50 border-r border-slate-100 z-30 w-[50px] min-w-[50px]">
                    Total
                  </th>
                  <th className="py-2.5 px-1 text-center sticky left-[264px] top-0 bg-slate-50 border-r border-slate-100 z-30 w-[56px] min-w-[56px]">
                    Telat
                  </th>
                  <th className="py-2.5 px-1 text-center sticky left-[320px] top-0 bg-slate-50 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)] z-30 w-[56px] min-w-[56px]">
                    Lembur
                  </th>
                  {daysInSelectedMonth.map((day) => {
                    const isSunday = sundaySet.has(day);
                    return (
                      <th
                        key={day}
                        className={`py-2.5 px-0.5 text-center w-[44px] min-w-[44px] max-w-[44px] text-[11px] font-black sticky top-0 z-20 ${
                          isSunday ? 'bg-red-50/90 text-red-500' : 'bg-slate-50/95 text-slate-600'
                        }`}
                      >
                        {day}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-100/80 font-bold text-gray-700">
                {displayedEmployees.filter((p) => p.role === 'user').length === 0 ? (
                  <tr>
                    <td colSpan={36} className="py-12 text-center text-gray-400 font-bold">
                      {filterMissingCheckOut
                        ? 'Tidak ada karyawan yang belum absen pulang pada filter ini.'
                        : searchTerm
                        ? 'Tidak ditemukan karyawan yang cocok.'
                        : 'Belum ada data karyawan terdaftar.'}
                    </td>
                  </tr>
                ) : (
                  displayedEmployees
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
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Kolom Nama Pinned */}
                          <td className="py-2 px-3 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[1px_0_3px_rgba(0,0,0,0.02)] w-[150px] min-w-[150px] max-w-[150px]">
                            <p className="font-extrabold text-slate-900 text-xs truncate" title={emp.full_name}>
                              {emp.full_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold truncate">NIK: {emp.nik}</p>
                          </td>

                          {/* Kolom Ringkasan Kehadiran Pinned */}
                          <td className="py-2 px-1 sticky left-[150px] bg-slate-50/90 z-10 border-r border-gray-100 text-center font-black text-emerald-600 text-xs w-[64px] min-w-[64px]">
                            {countInRange}h
                          </td>
                          <td className="py-2 px-1 sticky left-[214px] bg-slate-50/90 z-10 border-r border-gray-100 text-center font-black text-orange-600 text-xs w-[50px] min-w-[50px]">
                            {countTotal}h
                          </td>
                          <td className="py-2 px-1 sticky left-[264px] bg-slate-50/90 z-10 border-r border-gray-100 text-center font-black text-red-500 text-xs w-[56px] min-w-[56px]">
                            {formatLateMinutes(totalLateMinutes)}
                          </td>
                          <td className="py-2 px-1 sticky left-[320px] bg-slate-50/90 z-10 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)] text-center font-black text-purple-600 text-xs w-[56px] min-w-[56px]">
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
                                className={`py-1.5 px-0.5 text-center align-middle w-[44px] min-w-[44px] max-w-[44px] cursor-pointer hover:bg-orange-50/60 transition-colors ${
                                  isSunday ? 'bg-slate-50/40' : ''
                                }`}
                                title="Klik untuk tambah/edit absensi"
                              >
                                {log ? (
                                  (() => {
                                    const isLeave = ['Izin', 'Sakit', 'Cuti'].includes(log.status);
                                    const isLate = log.status === 'Terlambat';
                                    const isMissingCheckOut = !isLeave && !log.check_out;
                                    const isTodayLog =
                                      recapYear === currentYear &&
                                      recapMonth === currentMonth &&
                                      day === currentDay;

                                    const tooltip = (
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-52 bg-slate-900 text-white text-left p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-30 text-[10px] space-y-1 font-bold">
                                        <p className="text-orange-400 font-extrabold">
                                          Absensi {day} {monthNames[recapMonth]} {recapYear}
                                        </p>
                                        <p>
                                          Masuk:{' '}
                                          <span className="text-white font-extrabold">
                                            {formatWibTime(log.check_in)} WIB
                                          </span>{' '}
                                          ({log.status})
                                        </p>
                                        <p>
                                          Pulang:{' '}
                                          {log.check_out ? (
                                            <span className="text-white font-extrabold">
                                              {formatWibTime(log.check_out)} WIB
                                            </span>
                                          ) : isTodayLog ? (
                                            <span className="text-sky-300 font-extrabold inline-flex items-center gap-1">
                                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                                              Sedang Bekerja (Belum Pulang)
                                            </span>
                                          ) : (
                                            <span className="text-amber-400 font-black inline-flex items-center gap-1">
                                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                              Lupa Absen Pulang ⚠️
                                            </span>
                                          )}
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
                                          <span
                                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-700 text-[10px] font-black ${
                                              isMissingCheckOut
                                                ? isTodayLog
                                                  ? 'ring-1.5 ring-sky-400'
                                                  : 'ring-1.5 ring-amber-400'
                                                : ''
                                            }`}
                                          >
                                            T
                                          </span>
                                        ) : (
                                          <span
                                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black ${
                                              isMissingCheckOut
                                                ? isTodayLog
                                                  ? 'ring-1.5 ring-sky-400'
                                                  : 'ring-1.5 ring-amber-400'
                                                : ''
                                            }`}
                                          >
                                            ✓
                                          </span>
                                        )}

                                        {/* Indikator Belum Absen Pulang */}
                                        {isMissingCheckOut && (
                                          <span
                                            className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none"
                                            title={isTodayLog ? 'Sedang Bekerja (Belum Pulang)' : 'Lupa Absen Pulang'}
                                          >
                                            <span
                                              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                                isTodayLog ? 'bg-sky-400' : 'bg-amber-400'
                                              }`}
                                            />
                                            <span
                                              className={`relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-white shadow-xs ${
                                                isTodayLog ? 'bg-sky-500' : 'bg-amber-500'
                                              }`}
                                            />
                                          </span>
                                        )}

                                        {tooltip}
                                      </div>
                                    );
                                  })()
                                ) : isSunday ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100/70 text-slate-300 text-[10px] font-bold">
                                    -
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-red-50/80 text-red-300 text-[10px] font-bold">
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

              {/* Alert jika belum absen pulang */}
              {editingCell.log &&
                !editingCell.log.check_out &&
                !['Izin', 'Sakit', 'Cuti'].includes(editingCell.log.status) && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-2xl flex items-start gap-2.5 text-xs font-bold animate-fade-in">
                    <span className="text-base shrink-0 leading-none mt-0.5">⚠️</span>
                    <p className="leading-relaxed">
                      Karyawan belum memiliki jam pulang pada tanggal ini. Silakan isi <strong>Jam Pulang</strong> di bawah untuk melengkapi data absensi.
                    </p>
                  </div>
                )}

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

