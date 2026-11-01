import React from 'react';
import { Profile, NotificationRecord } from '@/types';
import { formatWibDate } from '@/lib/date';

interface NotificationManagerProps {
  notifFeedback: { success: boolean; message: string } | null;
  newNotifTitle: string;
  setNewNotifTitle: (val: string) => void;
  newNotifType: 'info' | 'warning' | 'success';
  setNewNotifType: (val: 'info' | 'warning' | 'success') => void;
  newNotifMessage: string;
  setNewNotifMessage: (val: string) => void;
  newNotifTarget: string;
  setNewNotifTarget: (val: string) => void;
  employees: Profile[];
  onSaveNotification: (e: React.FormEvent) => void;
  notifications: NotificationRecord[];
  notifLoading: boolean;
  onRefreshNotifications: () => void;
  onDeleteNotification: (id: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifFeedback,
  newNotifTitle,
  setNewNotifTitle,
  newNotifType,
  setNewNotifType,
  newNotifMessage,
  setNewNotifMessage,
  newNotifTarget,
  setNewNotifTarget,
  employees,
  onSaveNotification,
  notifications,
  notifLoading,
  onRefreshNotifications,
  onDeleteNotification,
}) => {
  return (
    <div className="p-3.5 md:p-5 max-w-6xl w-full space-y-3.5 md:space-y-4 flex-1 animate-fade-in">
      <div className="bg-white rounded-2xl p-3.5 md:p-4 shadow-sm border border-gray-100">
        <h3 className="text-xs md:text-sm font-black text-gray-800 mb-3 uppercase tracking-wider">
          Buat Notifikasi Baru
        </h3>

        {notifFeedback && (
          <div
            className={`p-3 rounded-xl mb-3 text-xs md:text-sm font-bold ${
              notifFeedback.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {notifFeedback.message}
          </div>
        )}

        <form onSubmit={onSaveNotification} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 mb-1 uppercase">Judul</label>
              <input
                type="text"
                value={newNotifTitle}
                onChange={(e) => setNewNotifTitle(e.target.value)}
                required
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-gray-800 focus:ring-2 focus:ring-orange-500"
                placeholder="Misal: Info Libur Lebaran"
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-gray-500 mb-1 uppercase">Tipe</label>
              <select
                value={newNotifType}
                onChange={(e) =>
                  setNewNotifType(e.target.value as 'info' | 'warning' | 'success')
                }
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-gray-800 focus:ring-2 focus:ring-orange-500"
              >
                <option value="info">Info (Biru)</option>
                <option value="warning">Peringatan (Kuning)</option>
                <option value="success">Sukses (Hijau)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-gray-500 mb-1 uppercase">
              Isi Pesan
            </label>
            <textarea
              value={newNotifMessage}
              onChange={(e) => setNewNotifMessage(e.target.value)}
              required
              rows={2}
              className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-gray-800 focus:ring-2 focus:ring-orange-500"
              placeholder="Ketik isi pengumuman..."
            />
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-gray-500 mb-1 uppercase">
              Target Penerima (Kosongkan jika Broadcast)
            </label>
            <select
              value={newNotifTarget}
              onChange={(e) => setNewNotifTarget(e.target.value)}
              className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-gray-800 focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- Semua Karyawan (Broadcast) --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.nik})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!newNotifTitle || !newNotifMessage}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 text-xs md:text-sm rounded-xl transition duration-200 shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              Kirim Notifikasi
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-3.5 md:p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-wider">
            Daftar Notifikasi Aktif
          </h3>
          <button
            onClick={onRefreshNotifications}
            className="text-orange-500 hover:bg-orange-50 p-2 rounded-lg transition cursor-pointer"
            title="Refresh Notifikasi"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className={`w-5 h-5 ${notifLoading ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400 font-bold">
              Belum ada notifikasi.
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="border border-slate-100 p-4 rounded-xl flex items-center justify-between gap-4 hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        n.type === 'info'
                          ? 'bg-blue-100 text-blue-700'
                          : n.type === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {n.type}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        n.target_user_id
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {n.target_user_id ? `PRIVATE: ${n.profiles?.full_name}` : 'BROADCAST'}
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
                  <h4 className="text-sm font-bold text-gray-800">{n.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.message}</p>
                </div>
                <button
                  onClick={() => onDeleteNotification(n.id)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition cursor-pointer"
                  title="Hapus Notifikasi"
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
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

