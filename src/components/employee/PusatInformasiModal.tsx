import React, { startTransition } from 'react';
import {
  Profile,
  NotificationRecord,
  AttendanceSummary,
  PayslipRecord,
  LeaveRequest,
} from '@/types';
import { formatWibDate } from '@/lib/date';
import { PayslipDetailModal } from './PayslipDetailModal';

interface PusatInformasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMainTab: 'notifications' | 'summary' | 'leave';
  setActiveMainTab: (tab: 'notifications' | 'summary' | 'leave') => void;
  hasUnreadSummary: boolean;
  setHasUnreadSummary: (val: boolean) => void;
  hasUnreadLeave: boolean;
  setHasUnreadLeave: (val: boolean) => void;
  // Notifications
  notifications: NotificationRecord[];
  notifLoading: boolean;
  fetchNotifications: () => void;
  // Attendance Summary & Payslip
  activePeriod: 1 | 2;
  setActivePeriod: (p: 1 | 2) => void;
  attendanceSummary: AttendanceSummary;
  summaryLoading: boolean;
  fetchAttendanceSummary: (p: 1 | 2) => void;
  payslips: PayslipRecord[];
  payslipLoading: boolean;
  fetchPayslips: () => void;
  selectedPayslip: PayslipRecord | null;
  setSelectedPayslip: (slip: PayslipRecord | null) => void;
  profile: Profile | null;
  // Leave
  leaveFeedback: { success: boolean; message: string } | null;
  newLeaveType: string;
  setNewLeaveType: (val: string) => void;
  newLeaveStart: string;
  setNewLeaveStart: (val: string) => void;
  newLeaveEnd: string;
  setNewLeaveEnd: (val: string) => void;
  newLeaveReason: string;
  setNewLeaveReason: (val: string) => void;
  leaveLoading: boolean;
  handleSubmitLeave: (e: React.FormEvent) => void;
  leaveHistory: LeaveRequest[];
  fetchLeaveHistory: () => void;
}

export const PusatInformasiModal: React.FC<PusatInformasiModalProps> = ({
  isOpen,
  onClose,
  activeMainTab,
  setActiveMainTab,
  hasUnreadSummary,
  setHasUnreadSummary,
  hasUnreadLeave,
  setHasUnreadLeave,
  notifications,
  notifLoading,
  fetchNotifications,
  activePeriod,
  setActivePeriod,
  attendanceSummary,
  summaryLoading,
  fetchAttendanceSummary,
  payslips,
  payslipLoading,
  fetchPayslips,
  selectedPayslip,
  setSelectedPayslip,
  profile,
  leaveFeedback,
  newLeaveType,
  setNewLeaveType,
  newLeaveStart,
  setNewLeaveStart,
  newLeaveEnd,
  setNewLeaveEnd,
  newLeaveReason,
  setNewLeaveReason,
  leaveLoading,
  handleSubmitLeave,
  leaveHistory,
  fetchLeaveHistory,
}) => {
  if (!isOpen) return null;

  const handleTabNotification = () => {
    startTransition(() => setActiveMainTab('notifications'));
    fetchNotifications();
  };

  const handleTabSummary = () => {
    startTransition(() => setActiveMainTab('summary'));
    fetchAttendanceSummary(activePeriod);
    fetchPayslips();
    setHasUnreadSummary(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`seen_summary_${new Date().toISOString().split('T')[0]}`, 'true');
    }
  };

  const handleTabLeave = () => {
    startTransition(() => setActiveMainTab('leave'));
    fetchLeaveHistory();
    setHasUnreadLeave(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`seen_leave_${new Date().toISOString().split('T')[0]}`, 'true');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in"
      onClick={() => {
        onClose();
        setSelectedPayslip(null);
      }}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-[2rem] p-6 h-[85vh] max-h-[750px] flex flex-col shadow-2xl animate-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {!selectedPayslip ? (
          <>
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h3 className="text-xl font-black text-gray-900">Pusat Informasi</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                title="Tutup Modal"
                aria-label="Tutup Modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Main Tabs */}
            <div className="relative flex p-1 bg-slate-100 rounded-2xl mb-5 shrink-0 z-0">
              <div
                className="absolute top-1 bottom-1 bg-white shadow-sm rounded-xl ease-spring z-0 hw-accelerate"
                style={{
                  width: 'calc(33.333% - 2.66px)',
                  transition: 'transform 0.4s',
                  transform:
                    activeMainTab === 'notifications'
                      ? 'translateX(0)'
                      : activeMainTab === 'summary'
                      ? 'translateX(100%)'
                      : 'translateX(200%)',
                }}
              />
              <button
                onClick={handleTabNotification}
                className={`relative z-10 flex-1 min-w-[80px] py-2 px-3 text-[11px] md:text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  activeMainTab === 'notifications'
                    ? 'text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Notifikasi
              </button>
              <button
                onClick={handleTabSummary}
                className={`relative z-10 flex-1 min-w-[80px] py-2 px-3 text-[11px] md:text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  activeMainTab === 'summary'
                    ? 'text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Absensi & Gaji
                {hasUnreadSummary && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
                )}
              </button>
              <button
                onClick={handleTabLeave}
                className={`relative z-10 flex-1 min-w-[80px] py-2 px-3 text-[11px] md:text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  activeMainTab === 'leave'
                    ? 'text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Izin / Cuti
                {hasUnreadLeave && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
                )}
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative custom-scrollbar pr-2">
              {activeMainTab === 'notifications' ? (
                <div className="py-2 animate-tab-soft">
                  {notifLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-xs font-bold text-slate-400">Memuat Notifikasi...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="w-8 h-8 text-slate-300"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                          />
                        </svg>
                      </div>
                      <p className="font-extrabold text-slate-500 text-sm">Belum ada notifikasi baru.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Pengumuman HR atau peringatan akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pb-4">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-4 rounded-2xl border shadow-sm ${
                            n.type === 'info'
                              ? 'bg-blue-50/50 border-blue-100'
                              : n.type === 'warning'
                              ? 'bg-orange-50/50 border-orange-100'
                              : 'bg-emerald-50/50 border-emerald-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                n.type === 'info'
                                  ? 'bg-blue-100 text-blue-700'
                                  : n.type === 'warning'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {n.type === 'warning' ? 'Peringatan' : n.type}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">
                              {formatWibDate(n.created_at, {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-800 mb-1">{n.title}</h4>
                          <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeMainTab === 'summary' ? (
                <div className="py-2 animate-tab-soft">
                  {/* Period Tabs */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => {
                        setActivePeriod(1);
                        fetchAttendanceSummary(1);
                      }}
                      className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all border cursor-pointer ${
                        activePeriod === 1
                          ? 'bg-orange-50 border-orange-200 text-orange-600'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Tgl 1 - 15
                    </button>
                    <button
                      onClick={() => {
                        setActivePeriod(2);
                        fetchAttendanceSummary(2);
                      }}
                      className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all border cursor-pointer ${
                        activePeriod === 2
                          ? 'bg-orange-50 border-orange-200 text-orange-600'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Tgl 16 - Akhir
                    </button>
                  </div>

                  {/* Attendance Summary */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4 mb-5 shadow-inner">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Rincian Absensi Periode {activePeriod}
                    </h4>
                    {summaryLoading ? (
                      <div className="py-4 text-center">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                          <p className="text-xl font-black text-slate-800">
                            {attendanceSummary.totalMasuk}
                          </p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Hari Kerja</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-red-50 text-center shadow-sm">
                          <p className="text-xl font-black text-red-500">
                            {attendanceSummary.totalTerlambat}
                          </p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Terlambat</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-blue-50 text-center shadow-sm">
                          <p className="text-xl font-black text-blue-500 flex items-baseline justify-center gap-0.5">
                            {Math.floor(attendanceSummary.totalLemburMenit / 60)}
                            <span className="text-xs font-bold text-blue-300">h</span>{' '}
                            {attendanceSummary.totalLemburMenit % 60}
                            <span className="text-xs font-bold text-blue-300">m</span>
                          </p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Lembur</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payslips */}
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Slip Gaji Terkait
                  </h4>
                  {payslipLoading ? (
                    <div className="py-8 flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                    </div>
                  ) : payslips.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="font-extrabold text-slate-400 text-xs">Belum ada slip gaji.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payslips.map((slip) => {
                        const mNames = [
                          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                        ];
                        return (
                          <button
                            key={slip.id}
                            onClick={() => setSelectedPayslip(slip)}
                            className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-2xl border border-purple-100 transition cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center">
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
                                  Slip Gaji {mNames[slip.period_month - 1]} {slip.period_year}{' '}
                                  <span className="text-purple-600">— {slip.period_label}</span>
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold">
                                  Gaji Bersih:{' '}
                                  <span className="text-purple-700">
                                    {slip.data.total_gaji_bersih != null
                                      ? new Intl.NumberFormat('id-ID', {
                                          style: 'currency',
                                          currency: 'IDR',
                                          maximumFractionDigits: 0,
                                        }).format(slip.data.total_gaji_bersih)
                                      : '-'}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2.5"
                              stroke="currentColor"
                              className="w-4 h-4 text-purple-300"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                              />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeMainTab === 'leave' ? (
                <div className="py-2 animate-tab-soft">
                  {/* Feedback Alert */}
                  {leaveFeedback && (
                    <div
                      className={`p-3 mb-4 text-xs font-bold rounded-xl ${
                        leaveFeedback.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {leaveFeedback.message}
                    </div>
                  )}

                  {/* Form Pengajuan Baru */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-5">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">
                      Buat Pengajuan Baru
                    </h4>
                    <form onSubmit={handleSubmitLeave} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Jenis</label>
                          <select
                            value={newLeaveType}
                            onChange={(e) => setNewLeaveType(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-slate-700"
                          >
                            <option value="Izin">Izin</option>
                            <option value="Sakit">Sakit</option>
                            <option value="Cuti">Cuti</option>
                          </select>
                        </div>
                        <div />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Mulai Tgl</label>
                          <input
                            type="date"
                            required
                            value={newLeaveStart}
                            onChange={(e) => setNewLeaveStart(e.target.value)}
                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Sampai Tgl</label>
                          <input
                            type="date"
                            required
                            value={newLeaveEnd}
                            onChange={(e) => setNewLeaveEnd(e.target.value)}
                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-slate-700"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          Alasan / Keterangan
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={newLeaveReason}
                          onChange={(e) => setNewLeaveReason(e.target.value)}
                          placeholder="Tuliskan keterangan lengkap..."
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:bg-white transition-all font-medium text-slate-700 resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={leaveLoading}
                        className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {leaveLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Kirim Pengajuan'
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Riwayat Pengajuan */}
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">
                      Riwayat Anda
                    </h4>
                    {leaveHistory.length === 0 ? (
                      <p className="text-xs text-center font-bold text-slate-400 py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Belum ada riwayat pengajuan.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {leaveHistory.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                  {item.type}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  item.status === 'Approved'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : item.status === 'Rejected'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-amber-50 text-amber-600'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <div className="text-xs font-extrabold text-slate-800 mb-1">
                              {formatWibDate(item.start_date, {
                                day: 'numeric',
                                month: 'short',
                              })}
                              {item.start_date !== item.end_date &&
                                ` - ${formatWibDate(item.end_date, {
                                  day: 'numeric',
                                  month: 'short',
                                })}`}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                              {item.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <PayslipDetailModal
            selectedPayslip={selectedPayslip}
            profile={profile}
            onBack={() => setSelectedPayslip(null)}
          />
        )}
      </div>
    </div>
  );
};

