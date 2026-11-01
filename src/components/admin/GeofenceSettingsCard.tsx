"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { GeofenceSettings } from '@/types';

const InteractiveGeofenceMap = dynamic(
  () => import('./InteractiveGeofenceMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[340px] md:min-h-[400px] rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 font-bold text-xs gap-2">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Memuat Peta Interaktif...</span>
      </div>
    ),
  }
);

interface GeofenceSettingsCardProps {
  geofence: GeofenceSettings;
  setGeofence: React.Dispatch<React.SetStateAction<GeofenceSettings>>;
  geofenceLoading: boolean;
  geofenceMessage: string;
  onUpdateGeofence: (e: React.FormEvent) => void;
}

export const GeofenceSettingsCard: React.FC<GeofenceSettingsCardProps> = ({
  geofence,
  setGeofence,
  geofenceLoading,
  geofenceMessage,
  onUpdateGeofence,
}) => {
  const handleMapLocationChange = (lat: number, lon: number) => {
    setGeofence((prev) => ({
      ...prev,
      factory_lat: lat,
      factory_lon: lon,
    }));
  };

  return (
    <div className="p-3.5 md:p-5 max-w-7xl w-full flex-1 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* KIRI: FORM CONFIG */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 md:p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 mb-1">
              Pengaturan & Aturan Kantor
            </h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Atur titik koordinat lokasi geofencing kantor, radius toleransi jarak, serta jadwal jam
              kerja absensi karyawan.
            </p>

            {geofenceMessage && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-bold border ${
                  geofenceMessage.includes('berhasil')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-red-50 text-red-600 border-red-100'
                }`}
              >
                {geofenceMessage}
              </div>
            )}

            <form onSubmit={onUpdateGeofence} className="space-y-4">
              {/* SEKSI 1: LOKASI & RADIUS */}
              <div className="border-b border-gray-100 pb-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-wider">
                    1. Lokasi & Radius Geofencing
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    💡 Bisa menitik langsung di peta
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                      Garis Lintang (Latitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={geofence.factory_lat}
                      onChange={(e) =>
                        setGeofence({ ...geofence, factory_lat: Number(e.target.value) })
                      }
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                      Garis Bujur (Longitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={geofence.factory_lon}
                      onChange={(e) =>
                        setGeofence({ ...geofence, factory_lon: Number(e.target.value) })
                      }
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                    Radius Batas Toleransi
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      required
                      min={5}
                      max={10000}
                      value={geofence.radius_meters}
                      onChange={(e) =>
                        setGeofence({ ...geofence, radius_meters: Number(e.target.value) })
                      }
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                    <span className="absolute right-4 text-xs font-extrabold text-gray-400">
                      Meter
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    Lingkaran bundaran radius pada peta akan otomatis menyesuaikan ukuran jarak ini.
                  </p>
                </div>
              </div>

              {/* SEKSI 2: JAM KERJA & ATURAN */}
              <div className="pb-1">
                <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-wider mb-2.5">
                  2. Jam Kerja & Aturan Absensi
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                      Jam Masuk Kantor
                    </label>
                    <input
                      type="time"
                      required
                      value={geofence.work_start_time}
                      onChange={(e) =>
                        setGeofence({ ...geofence, work_start_time: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                      Jam Pulang Kantor
                    </label>
                    <input
                      type="time"
                      required
                      value={geofence.work_end_time}
                      onChange={(e) =>
                        setGeofence({ ...geofence, work_end_time: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                      Mulai Istirahat
                    </label>
                    <input
                      type="time"
                      required
                      value={geofence.break_start_time}
                      onChange={(e) =>
                        setGeofence({ ...geofence, break_start_time: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                      Selesai Istirahat
                    </label>
                    <input
                      type="time"
                      required
                      value={geofence.break_end_time}
                      onChange={(e) =>
                        setGeofence({ ...geofence, break_end_time: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                  <label className="block text-[10px] font-black text-orange-500 uppercase tracking-wider mb-2">
                    Jadwal Sabtu (Setengah Hari)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                        Masuk Sabtu
                      </label>
                      <input
                        type="time"
                        required
                        value={geofence.saturday_work_start_time}
                        onChange={(e) =>
                          setGeofence({ ...geofence, saturday_work_start_time: e.target.value })
                        }
                        className="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">
                        Pulang Sabtu
                      </label>
                      <input
                        type="time"
                        required
                        value={geofence.saturday_work_end_time}
                        onChange={(e) =>
                          setGeofence({ ...geofence, saturday_work_end_time: e.target.value })
                        }
                        className="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                      Toleransi Terlambat
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        required
                        min={0}
                        max={240}
                        value={geofence.late_tolerance_minutes}
                        onChange={(e) =>
                          setGeofence({
                            ...geofence,
                            late_tolerance_minutes: Number(e.target.value),
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                      />
                      <span className="absolute right-3 text-xs font-extrabold text-gray-400">
                        Menit
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                      Ambang Batas Lembur
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        required
                        min={0}
                        max={480}
                        value={geofence.overtime_threshold_minutes}
                        onChange={(e) =>
                          setGeofence({
                            ...geofence,
                            overtime_threshold_minutes: Number(e.target.value),
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500"
                      />
                      <span className="absolute right-3 text-xs font-extrabold text-gray-400">
                        Menit
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={geofenceLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs md:text-sm py-2.5 md:py-3 rounded-xl transition shadow-md active:scale-95 cursor-pointer"
              >
                {geofenceLoading ? 'Menyimpan...' : 'Simpan Pengaturan Kantor'}
              </button>
            </form>
          </div>
        </div>

        {/* KANAN: MAP PREVIEW INTERAKTIF */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 md:p-5 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base md:text-lg font-bold text-gray-800">
              Pratinjau Peta Lokasi Interaktif
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            Peta langsung menunjukkan titik posisi kantor dan lingkaran bundaran radius batas toleransi.
          </p>

          <div className="flex-1 w-full min-h-[360px] md:min-h-[420px] flex flex-col">
            <InteractiveGeofenceMap
              lat={geofence.factory_lat}
              lon={geofence.factory_lon}
              radiusMeters={geofence.radius_meters}
              onChangeLocation={handleMapLocationChange}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${geofence.factory_lat},${geofence.factory_lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-center font-bold text-xs py-2.5 rounded-xl transition shadow-md hover-lift cursor-pointer flex items-center justify-center gap-2"
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
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              Buka di Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
