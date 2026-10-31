import React from 'react';
import { PayslipRecord, Profile } from '@/types';

interface PayslipDetailModalProps {
  selectedPayslip: PayslipRecord | null;
  profile: Profile | null;
  onBack: () => void;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({
  selectedPayslip,
  profile,
  onBack,
}) => {
  if (!selectedPayslip) return null;

  const d = selectedPayslip.data;
  const mNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const fmt = (v: unknown) =>
    v != null && v !== 0 && v !== '0'
      ? new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(Number(v))
      : null;

  const hasPotongan = d.potongan || d.potongan_lain_lain || d.potongan_masuk_jam;
  const upahHariText =
    d.upah_per_hari != null &&
    d.total_masuk != null &&
    d.upah_per_hari !== 0 &&
    d.total_masuk !== 0
      ? `${new Intl.NumberFormat('id-ID').format(Number(d.upah_per_hari))} × ${d.total_masuk} hari`
      : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 animate-fade-in pb-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 mb-4 cursor-pointer transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Kembali ke Daftar
      </button>

      {/* ═══ HEADER DOKUMEN FORMAL ═══ */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 mb-5 text-white">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase">
              Slip Gaji Karyawan
            </p>
            <p className="text-base font-black text-white mt-0.5">
              PT. SENNDYT SARUNGTANGAN KREATIF
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Jl. Pasar Turi, Sidomulyo, Bambanglipuro, Bantul
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Periode</p>
              <p className="text-xs font-black text-white">
                {mNames[selectedPayslip.period_month - 1]} {selectedPayslip.period_year}
              </p>
              <p className="text-[10px] font-extrabold text-orange-300">
                {selectedPayslip.period_label}
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nama</p>
            <p className="text-[11px] font-extrabold text-white">
              {d.nama || profile?.full_name}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">NIK</p>
            <p className="text-[11px] font-extrabold text-white">{profile?.nik}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Jabatan</p>
            <p className="text-[11px] font-extrabold text-white">{d.jabatan || '-'}</p>
          </div>
        </div>
      </div>

      {/* ═══ TABEL RINCIAN GAJI ═══ */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
        {/* Header Tabel */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-200">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
            Rincian Pendapatan
          </p>
        </div>

        {/* Gaji Pokok & Upah Harian */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-500">Gaji Pokok (Info)</span>
            <span className="text-[10px] font-bold text-gray-400">{fmt(d.gaji_pokok) || '-'}</span>
          </div>
          {upahHariText && (
            <div className="flex justify-between items-center mt-2">
              <div>
                <span className="text-xs font-bold text-gray-700 block">Upah Kehadiran</span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">Rp {upahHariText}</span>
              </div>
              <span className="text-xs font-extrabold text-gray-900">
                {fmt(Number(d.upah_per_hari || 0) * Number(d.total_masuk || 0))}
              </span>
            </div>
          )}
        </div>

        {/* Tunjangan */}
        {d.tunjangan != null && d.tunjangan !== 0 && (
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700">Tunjangan</span>
            <span className="text-xs font-extrabold text-gray-900">{fmt(d.tunjangan)}</span>
          </div>
        )}

        {/* Premi */}
        {d.premi != null && d.premi !== 0 && (
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700">Premi</span>
            <span className="text-xs font-extrabold text-gray-900">{fmt(d.premi)}</span>
          </div>
        )}

        {/* Gaji Lembur */}
        {d.gaji_lembur != null && d.gaji_lembur !== 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700">Gaji Lembur</span>
              <span className="text-xs font-extrabold text-gray-900">{fmt(d.gaji_lembur)}</span>
            </div>
            {d.total_lembur_jam != null && d.total_lembur_jam !== 0 && (
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                {d.total_lembur_jam} jam × Rp{' '}
                {new Intl.NumberFormat('id-ID').format(Number(d.upah_lembur_per_jam))}/jam
              </p>
            )}
          </div>
        )}

        {/* Upah Borongan */}
        {d.upah_borongan != null && d.upah_borongan !== 0 && (
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700">Upah Borongan</span>
            <span className="text-xs font-extrabold text-gray-900">{fmt(d.upah_borongan)}</span>
          </div>
        )}

        {/* Over Target */}
        {d.over_target != null && d.over_target !== 0 && (
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700">Over Target</span>
            <span className="text-xs font-extrabold text-gray-900">{fmt(d.over_target)}</span>
          </div>
        )}

        {/* Lain-lain (Pendapatan Tambahan) */}
        {d.lain_lain != null && d.lain_lain !== 0 && (
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700">Lain-lain</span>
            <span className="text-xs font-extrabold text-gray-900">{fmt(d.lain_lain)}</span>
          </div>
        )}

        {/* Subtotal Pendapatan */}
        <div className="flex justify-between items-center px-4 py-3 bg-emerald-50 border-b border-emerald-100">
          <span className="text-xs font-black text-emerald-800">Jumlah Pendapatan</span>
          <span className="text-sm font-black text-emerald-700">
            {fmt(d.total_gaji_b) || fmt(d.total_gaji_a) || '-'}
          </span>
        </div>

        {/* POTONGAN */}
        {hasPotongan && (
          <>
            <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-200">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
                Rincian Potongan
              </p>
            </div>

            {d.potongan != null && d.potongan !== 0 && (
              <div className="px-4 py-2.5 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700">Potongan Keterlambatan</span>
                  <span className="text-xs font-extrabold text-red-600">{fmt(d.potongan)}</span>
                </div>
                {d.potongan_masuk_jam != null && d.potongan_masuk_jam !== 0 && (
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {d.potongan_masuk_jam} jam
                  </p>
                )}
              </div>
            )}

            {d.potongan_lain_lain != null && d.potongan_lain_lain !== 0 && (
              <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700">Potongan Lain-lain</span>
                <span className="text-xs font-extrabold text-red-600">{fmt(d.potongan_lain_lain)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ TOTAL GAJI BERSIH ═══ */}
      <div className="border-2 border-slate-800 rounded-2xl overflow-hidden mb-5 shadow-md">
        <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.15em]">
            Total Gaji Bersih yang Diterima
          </p>
        </div>
        <div className="bg-white px-4 py-4 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-gray-400 font-bold">
              {mNames[selectedPayslip.period_month - 1]} {selectedPayslip.period_year} ·{' '}
              {selectedPayslip.period_label}
            </p>
            <p className="text-[10px] text-gray-400 font-medium">{d.nama || profile?.full_name}</p>
          </div>
          <p className="text-xl font-black text-slate-900">{fmt(d.total_gaji_bersih) || '-'}</p>
        </div>
      </div>

      {/* ═══ INFO PEMBAYARAN ═══ */}
      {(d.no_rekening || d.no_whatsapp) && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-2">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-200">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
              Informasi Pembayaran
            </p>
          </div>
          <div className="p-4 space-y-2 text-xs">
            {d.no_rekening && (
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">No. Rekening</span>
                <span className="font-extrabold text-slate-800">{String(d.no_rekening)}</span>
              </div>
            )}
            {d.no_whatsapp && (
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">WhatsApp</span>
                <span className="font-extrabold text-slate-800">{String(d.no_whatsapp)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

