import React from 'react';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types';
import { formatWibDate } from '@/lib/date';

interface EmployeeManagerProps {
  processedEmployees: Profile[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  sortBy: 'newest' | 'excel' | 'name' | 'nik';
  setSortBy: (val: 'newest' | 'excel' | 'name' | 'nik') => void;
  visiblePasscodes: Record<string, boolean>;
  togglePasscodeVisibility: (id: string) => void;
  currentUser: User | null;
  onStartEdit: (emp: Profile) => void;
  onDeleteEmployee: (emp: Profile) => void;
  onShowResetModal: () => void;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importLoading?: boolean;
  importProgress?: { current: number; total: number } | null;
  importFeedback: { success: boolean; message: string } | null;
  onDismissImportFeedback: () => void;
  // Form props
  editingEmployee: Profile | null;
  newNik: string;
  setNewNik: (val: string) => void;
  newFullName: string;
  setNewFullName: (val: string) => void;
  newPasscode: string;
  setNewPasscode: (val: string) => void;
  newRole: 'user' | 'admin';
  setNewRole: (val: 'user' | 'admin') => void;
  regLoading: boolean;
  regFeedback: { success: boolean; message: string } | null;
  onSaveEmployee: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  processedEmployees,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  visiblePasscodes,
  togglePasscodeVisibility,
  currentUser,
  onStartEdit,
  onDeleteEmployee,
  onShowResetModal,
  onImportExcel,
  importLoading,
  importProgress,
  importFeedback,
  onDismissImportFeedback,
  editingEmployee,
  newNik,
  setNewNik,
  newFullName,
  setNewFullName,
  newPasscode,
  setNewPasscode,
  newRole,
  setNewRole,
  regLoading,
  regFeedback,
  onSaveEmployee,
  onCancelEdit,
}) => {
  return (
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 flex-1 animate-fade-in">
      {/* Kiri: Daftar Karyawan Terdaftar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 lg:col-span-2">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 md:mb-6">
          <h3 className="text-sm md:text-lg font-bold text-gray-800">Daftar Karyawan Terdaftar</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onShowResetModal}
              className="hover-lift border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-2 px-3 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
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
              <span className="hidden sm:inline">Reset</span> Data
            </button>

            <input
              type="file"
              id="excel-import"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={onImportExcel}
            />
            <label
              htmlFor="excel-import"
              className={`hover-lift bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5 ${
                importLoading ? 'opacity-60 pointer-events-none' : ''
              }`}
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
                  d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {importLoading ? 'Memproses...' : 'Import'}
            </label>
          </div>
        </div>

        {importProgress && (
          <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
              <span>Mengimpor akun karyawan...</span>
              <span>
                {importProgress.current} / {importProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    importProgress.total > 0
                      ? Math.round((importProgress.current / importProgress.total) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {importFeedback && (
          <div
            className={`p-4 rounded-xl mb-5 text-xs font-bold border flex items-center justify-between ${
              importFeedback.success
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}
          >
            <span>{importFeedback.message}</span>
            <button
              onClick={onDismissImportFeedback}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* FILTER DAN SEARCH BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Cari Karyawan (Nama / NIK)
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Masukkan nama atau NIK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 shadow-sm transition-all"
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
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Urutan Data Karyawan
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'excel' | 'name' | 'nik')}
              className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
            >
              <option value="newest">Paling Baru Didaftarkan</option>
              <option value="excel">Sesuai Urutan File Excel</option>
              <option value="name">Nama Karyawan (A - Z)</option>
              <option value="nik">Nomor NIK (Terkecil)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[550px] overflow-y-auto border border-slate-100/80 rounded-2xl shadow-inner bg-slate-50/20">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md shadow-[0_1px_0_rgba(241,245,249,1)]">
              <tr className="text-xs font-bold text-gray-400 uppercase">
                <th className="py-3 px-4 rounded-l-xl">Nama Karyawan</th>
                <th className="py-3 px-4">NIK</th>
                <th className="py-3 px-4">Role / Jabatan</th>
                <th className="py-3 px-4">PIN Passcode</th>
                <th className="py-3 px-4">Tgl Daftar</th>
                <th className="py-3 px-4 rounded-r-xl text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50 font-bold text-gray-700">
              {processedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400 font-bold">
                    {searchTerm ? 'Tidak ditemukan karyawan yang cocok.' : 'Belum ada data karyawan.'}
                  </td>
                </tr>
              ) : (
                processedEmployees.map((emp) => {
                  const dateReg = formatWibDate(emp.created_at, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-4 text-gray-900 font-extrabold">{emp.full_name}</td>
                      <td className="py-3.5 px-4 text-gray-600">{emp.nik}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            emp.role === 'admin'
                              ? 'bg-orange-50 text-orange-600 border border-orange-100'
                              : 'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}
                        >
                          {emp.role === 'admin' ? 'Admin' : 'Karyawan'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span>
                            {visiblePasscodes[emp.id] ? emp.passcode || '123456' : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasscodeVisibility(emp.id)}
                            className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded hover:bg-slate-50 transition cursor-pointer"
                            title={visiblePasscodes[emp.id] ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {visiblePasscodes[emp.id] ? (
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
                                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                                />
                              </svg>
                            ) : (
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
                                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 text-xs">{dateReg}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onStartEdit(emp)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-xl transition cursor-pointer"
                            title="Edit Karyawan"
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
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                              />
                            </svg>
                          </button>
                          {emp.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => onDeleteEmployee(emp)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-xl transition cursor-pointer"
                              title="Hapus Karyawan"
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
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kanan: Form Registrasi / Edit Karyawan */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 h-fit animate-fade-in"
        key={editingEmployee ? 'edit' : 'register'}
      >
        <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-1 md:mb-2">
          {editingEmployee ? 'Edit Karyawan' : 'Daftarkan Karyawan Baru'}
        </h3>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          {editingEmployee
            ? 'Ubah rincian profil, jabatan, atau passcode pin untuk karyawan ini.'
            : 'Buat akun login presensi bagi karyawan baru. Gunakan NIK yang valid dan passcode angka.'}
        </p>

        {regFeedback && (
          <div
            className={`p-4 rounded-xl mb-5 text-xs font-bold border ${
              regFeedback.success
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}
          >
            {regFeedback.message}
          </div>
        )}

        <form onSubmit={onSaveEmployee} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase mb-1">
              Nomor NIK
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 20260199"
              value={newNik}
              onChange={(e) => setNewNik(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              placeholder="Nama lengkap karyawan"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase mb-1">
              PIN Passcode (6 Angka)
            </label>
            <input
              type="password"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="Contoh: 123456"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold text-center tracking-widest focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-400 uppercase mb-1">
              Role Jabatan
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
              className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
            >
              <option value="user">Karyawan Biasa</option>
              <option value="admin">Administrator Panel</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={regLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition shadow-md active:scale-95 cursor-pointer"
          >
            {regLoading
              ? editingEmployee
                ? 'Menyimpan...'
                : 'Mendaftarkan...'
              : editingEmployee
              ? 'Simpan Perubahan'
              : 'Daftarkan Karyawan'}
          </button>
          {editingEmployee && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition active:scale-95 cursor-pointer"
            >
              Batal Edit
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
