import React from 'react';
import { LeaveRequest } from '@/types';
import { formatWibDate } from '@/lib/date';

interface LeaveManagerProps {
  leaveRequests: LeaveRequest[];
  leaveLoading: boolean;
  leaveActionLoading: boolean;
  onRefreshLeaveRequests: () => void;
  onUpdateLeaveStatus: (req: LeaveRequest, status: 'Approved' | 'Rejected') => void;
  onDeleteLeave: (id: string) => void;
}

export const LeaveManager: React.FC<LeaveManagerProps> = ({
  leaveRequests,
  leaveLoading,
  leaveActionLoading,
  onRefreshLeaveRequests,
  onUpdateLeaveStatus,
  onDeleteLeave,
}) => {
  return (
    <div className="p-3.5 md:p-5 max-w-6xl w-full space-y-3.5 md:space-y-4 flex-1 animate-fade-in">
      <div className="bg-white rounded-2xl p-3.5 md:p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-wider">
              Daftar Pengajuan
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelola permohonan cuti, sakit, dan izin karyawan.
            </p>
          </div>
          <button
            onClick={onRefreshLeaveRequests}
            className="text-orange-500 hover:bg-orange-50 p-2 rounded-lg transition cursor-pointer"
            title="Refresh Pengajuan"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className={`w-5 h-5 ${leaveLoading ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400 font-bold">Belum ada pengajuan izin/cuti.</p>
            </div>
          ) : (
            leaveRequests.map((req) => (
              <div
                key={req.id}
                className="border border-slate-100 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {req.type}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        req.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : req.status === 'Rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold hidden md:inline-block">
                      Diajukan:{' '}
                      {formatWibDate(req.created_at, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-gray-800">
                    {req.profiles?.full_name}{' '}
                    <span className="text-xs font-bold text-slate-400 ml-1">
                      ({req.profiles?.nik})
                    </span>
                  </h4>
                  <p className="text-xs font-bold text-orange-500 mt-1">
                    Tgl:{' '}
                    {formatWibDate(req.start_date, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {req.start_date !== req.end_date &&
                      ` - ${formatWibDate(req.end_date, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}`}
                  </p>
                  <p className="text-xs text-gray-600 mt-1.5 font-medium leading-relaxed">
                    &ldquo;{req.reason}&rdquo;
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                  {req.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => onUpdateLeaveStatus(req, 'Rejected')}
                        disabled={leaveActionLoading}
                        className="flex-1 md:flex-none px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => onUpdateLeaveStatus(req, 'Approved')}
                        disabled={leaveActionLoading}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition cursor-pointer"
                      >
                        Setujui
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onDeleteLeave(req.id)}
                    disabled={leaveActionLoading}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-500 rounded-xl transition cursor-pointer flex items-center justify-center"
                    title="Hapus Data"
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

