import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { AttendanceLog, GeofenceSettings } from '@/types';
import { formatWibTime } from '@/lib/date';

interface DashboardOverviewProps {
  stats: {
    totalEmployees: number;
    checkedIn: number;
    late: number;
    absent: number;
  };
  weeklyStats: Array<{ date: string; hadir: number }>;
  logs: AttendanceLog[];
  geofence: GeofenceSettings;
  getOvertimeMinutes: (checkOut: string | null, workEndTime: string) => number;
  formatOvertimeMinutes: (minutes: number) => string;
  onExportCSV: () => void;
  onNavigateToGeofence: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  weeklyStats,
  logs,
  geofence,
  getOvertimeMinutes,
  formatOvertimeMinutes,
  onExportCSV,
  onNavigateToGeofence,
}) => {
  return (
    <div className="p-3.5 md:p-5 space-y-3.5 md:space-y-4 flex-1 animate-fade-in">
      {/* BARIS STATISTIK */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Karyawan */}
        <div className="hover-lift bg-white p-3 md:p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-[10px] md:text-xs font-extrabold text-gray-400 uppercase">
              Total Karyawan
            </p>
            <p className="text-xl md:text-2xl font-black mt-0.5 text-gray-900">
              {stats.totalEmployees}{' '}
              <span className="text-xs font-medium text-gray-400">Orang</span>
            </p>
          </div>
          <div className="p-2 md:p-2.5 bg-blue-50 text-blue-600 rounded-xl">
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
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
        </div>

        {/* Hadir */}
        <div className="hover-lift bg-white p-3 md:p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-[10px] md:text-xs font-extrabold text-gray-400 uppercase">
              Sudah Absen
            </p>
            <p className="text-xl md:text-2xl font-black mt-0.5 text-emerald-600">
              {stats.checkedIn} <span className="text-xs font-medium text-gray-400">Orang</span>
            </p>
          </div>
          <div className="p-2 md:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Terlambat */}
        <div className="hover-lift bg-white p-3 md:p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-[10px] md:text-xs font-extrabold text-gray-400 uppercase">
              Terlambat
            </p>
            <p className="text-xl md:text-2xl font-black mt-0.5 text-amber-500">
              {stats.late} <span className="text-xs font-medium text-gray-400">Orang</span>
            </p>
          </div>
          <div className="p-2 md:p-2.5 bg-amber-50 text-amber-500 rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Belum Hadir */}
        <div className="hover-lift bg-white p-3 md:p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-[10px] md:text-xs font-extrabold text-gray-400 uppercase">
              Belum Absen
            </p>
            <p className="text-xl md:text-2xl font-black mt-0.5 text-red-500">
              {stats.absent} <span className="text-xs font-medium text-gray-400">Orang</span>
            </p>
          </div>
          <div className="p-2 md:p-2.5 bg-red-50 text-red-500 rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* GRAFIK ANALITIK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 md:gap-4">
        {/* Tren Kehadiran Mingguan (Line Chart) */}
        <div className="bg-white p-3.5 md:p-4 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 hover:shadow-md transition duration-300">
          <h3 className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-wider mb-2 md:mb-3">
            Tren Kehadiran (7 Hari)
          </h3>
          <div className="h-44 md:h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyStats} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hadir"
                  name="Karyawan Hadir"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Komposisi Hari Ini (Pie Chart) */}
        <div className="bg-white p-3.5 md:p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
          <h3 className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-wider mb-2 md:mb-3">
            Status Hari Ini
          </h3>
          <div className="h-44 md:h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Tepat Waktu', value: Math.max(0, stats.checkedIn - stats.late) },
                    { name: 'Terlambat', value: stats.late },
                    { name: 'Belum Absen', value: stats.absent },
                  ].filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={62}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {[
                    { name: 'Tepat Waktu', value: Math.max(0, stats.checkedIn - stats.late) },
                    { name: 'Terlambat', value: stats.late },
                    { name: 'Belum Absen', value: stats.absent },
                  ]
                    .filter((d) => d.value > 0)
                    .map((entry, index) => {
                      const colors = {
                        'Tepat Waktu': '#10b981',
                        Terlambat: '#f59e0b',
                        'Belum Absen': '#ef4444',
                      };
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[entry.name as keyof typeof colors]}
                        />
                      );
                    })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '4px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LAYOUT DUA KOLOM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 md:gap-4">
        {/* Kiri: Tabel Presensi Hari Ini */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 md:p-4 lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm md:text-base font-bold text-gray-800">Aktivitas Presensi Hari Ini</h3>
            <button
              onClick={onExportCSV}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3 py-1.5 md:py-2 rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
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
              <span className="hidden sm:inline">Ekspor</span> CSV
            </button>
          </div>

          <div className="overflow-x-auto max-h-[220px] md:max-h-[260px] overflow-y-auto border border-slate-100/80 rounded-xl shadow-inner bg-slate-50/20">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md shadow-[0_1px_0_rgba(241,245,249,1)]">
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3 md:px-4 rounded-l-xl">Nama / NIK</th>
                  <th className="py-2.5 px-3 md:px-4">Masuk</th>
                  <th className="py-2.5 px-3 md:px-4">Pulang</th>
                  <th className="py-2.5 px-3 md:px-4">Lembur</th>
                  <th className="py-2.5 px-3 md:px-4 rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm divide-y divide-gray-50 font-bold text-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 font-bold text-xs">
                      Belum ada aktivitas presensi hari ini.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const timeIn = formatWibTime(log.check_in);
                    const timeOut = log.check_out ? formatWibTime(log.check_out) : '--:--';

                    let badgeClass = '';
                    if (log.status === 'Tepat Waktu' || log.status === 'Sudah Pulang') {
                      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    } else if (log.status === 'Terlambat') {
                      badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                    }

                    const overtimeMins = getOvertimeMinutes(log.check_out, geofence.work_end_time);

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-2 md:py-2.5 px-3 md:px-4">
                          <p className="font-extrabold text-gray-900 text-xs md:text-sm">
                            {log.profiles?.full_name || 'Karyawan'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">
                            NIK: {log.profiles?.nik || '-'}
                          </p>
                        </td>
                        <td className="py-2 md:py-2.5 px-3 md:px-4 text-gray-600">{timeIn}</td>
                        <td className="py-2 md:py-2.5 px-3 md:px-4 text-gray-600">{timeOut}</td>
                        <td className="py-2 md:py-2.5 px-3 md:px-4">
                          {overtimeMins > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] md:text-xs px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-100 font-bold">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2.5"
                                stroke="currentColor"
                                className="w-3 h-3"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {formatOvertimeMinutes(overtimeMins)}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs font-bold">—</span>
                          )}
                        </td>
                        <td className="py-2 md:py-2.5 px-3 md:px-4">
                          <span
                            className={`inline-flex text-[10px] md:text-xs px-2 py-0.5 rounded-full border ${badgeClass}`}
                          >
                            {log.status === 'Tepat Waktu'
                              ? '✓ Tepat'
                              : log.status === 'Terlambat'
                              ? 'Telat'
                              : log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kanan: Ringkasan Pengaturan Geofence Cepat */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 md:p-4 flex flex-col justify-between h-fit space-y-3.5">
          <div>
            <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1">Titik Pabrik Aktif</h3>
            <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
              Koordinat yang digunakan oleh HP karyawan untuk validasi geofencing.
            </p>

            <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div>
                <p className="text-[9px] uppercase font-bold text-gray-400">
                  Garis Lintang (Latitude)
                </p>
                <p className="text-xs md:text-sm font-extrabold text-gray-800">{geofence.factory_lat}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-gray-400">
                  Garis Bujur (Longitude)
                </p>
                <p className="text-xs md:text-sm font-extrabold text-gray-800">{geofence.factory_lon}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-gray-400">
                  Jarak Radius Maksimal
                </p>
                <p className="text-xs md:text-sm font-extrabold text-orange-600">
                  {geofence.radius_meters} Meter
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onNavigateToGeofence}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md active:scale-95 cursor-pointer"
          >
            Ubah Koordinat Area
          </button>
        </div>
      </div>
    </div>
  );
};

