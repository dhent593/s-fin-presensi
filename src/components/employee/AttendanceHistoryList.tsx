import React from 'react';
import { AttendanceLog } from '@/types';
import { formatWibDate, formatWibTime } from '@/lib/date';

interface AttendanceHistoryListProps {
  history: AttendanceLog[];
  calculateLateMinutes: (checkInStr: string) => number;
  onOpenPayslips: () => void;
}

export const AttendanceHistoryList: React.FC<AttendanceHistoryListProps> = ({
  history,
  calculateLateMinutes,
  onOpenPayslips,
}) => {
  return (
    <>
      {/* RIWAYAT ABSENSI 7 HARI TERAKHIR (TITLE FIXED) */}
      <div className="animate-slide-up [animation-delay:150ms]">
        <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-3.5 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-5 h-5 text-orange-500"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Riwayat Absen 7 Hari Terakhir
        </h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-10 pr-2">
        <div className="mb-6 animate-slide-up [animation-delay:150ms]">
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 font-extrabold text-sm shadow-sm">
                Belum ada riwayat absensi.
              </div>
            ) : (
              history.map((log) => {
                const dayName = formatWibDate(log.check_in, { weekday: 'long' });
                const dateNum = formatWibDate(log.check_in, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                const timeIn = formatWibTime(log.check_in);
                const timeOut = log.check_out ? formatWibTime(log.check_out) : '--:--';

                let statusColor = 'text-slate-500 bg-slate-50 border-slate-100';
                if (log.status === 'Tepat Waktu' || log.status === 'Sudah Pulang') {
                  statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100/70';
                } else if (log.status === 'Terlambat') {
                  statusColor = 'text-amber-700 bg-amber-50 border-amber-100/70';
                }

                return (
                  <div
                    key={log.id}
                    className="hover-lift bg-white p-4.5 rounded-[1.5rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all duration-300"
                  >
                    <div>
                      <p className="font-black text-sm text-slate-800">
                        {dayName}, {dateNum}
                      </p>
                      <p
                        className={`text-[10px] font-black mt-1 inline-block px-3 py-0.5 rounded-full border ${statusColor}`}
                      >
                        {log.status.toUpperCase()}
                        {log.status === 'Terlambat' &&
                          ` (${calculateLateMinutes(log.check_in)} Menit)`}
                      </p>
                    </div>
                    <div className="text-right text-xs font-bold text-slate-400 space-y-1">
                      <p>
                        Masuk: <span className="text-slate-700 font-extrabold">{timeIn}</span>
                      </p>
                      <p>
                        Pulang: <span className="text-slate-700 font-extrabold">{timeOut}</span>
                      </p>
                      {log.break_start && (
                        <p className="text-blue-500">
                          Istirahat:{' '}
                          <span className="font-extrabold">
                            {formatWibTime(log.break_start)}
                            {log.break_end
                              ? ` – ${formatWibTime(log.break_end)}`
                              : ' (blm selesai)'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <br />
        {/* TOMBOL LIHAT SLIP GAJI */}
        <div className="mb-4 animate-slide-up [animation-delay:200ms]">
          <button
            onClick={onOpenPayslips}
            className="hover-lift w-full flex items-center justify-between bg-white border border-purple-100 hover:border-purple-300 px-5 py-4 rounded-2xl shadow-sm transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
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
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-extrabold text-sm text-gray-900">Lihat Slip Gaji</p>
                <p className="text-[10px] text-gray-400 font-bold">Rincian gaji bulanan Anda</p>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

