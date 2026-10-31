export interface Profile {
  id: string;
  nik: string;
  full_name: string;
  role: 'user' | 'admin';
  passcode: string;
  created_at: string;
}

export interface AttendanceLog {
  id: number;
  user_id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  latitude: number;
  longitude: number;
  break_start?: string | null;
  break_end?: string | null;
  notes?: string | null;
  profiles?: {
    nik: string;
    full_name: string;
  } | null;
}

export interface GeofenceSettings {
  id: number;
  factory_lat: number;
  factory_lon: number;
  radius_meters: number;
  work_start_time: string;
  work_end_time: string;
  saturday_work_start_time: string;
  saturday_work_end_time: string;
  break_start_time: string;
  break_end_time: string;
  late_tolerance_minutes: number;
  overtime_threshold_minutes: number;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    nik: string;
  } | null;
}

export interface NotificationRecord {
  id: string;
  created_at: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
  target_user_id?: string | null;
  is_active?: boolean;
  profiles?: {
    full_name: string;
  } | null;
}

export interface PayslipData {
  no_urut?: number | string | null;
  nama?: string | null;
  jabatan?: string | null;
  gaji_pokok?: number | null;
  upah_per_hari?: number | null;
  total_masuk?: number | null;
  total_gaji_a?: number | null;
  premi?: number | null;
  tunjangan?: number | null;
  total_lembur_jam?: number | null;
  upah_lembur_per_jam?: number | null;
  gaji_lembur?: number | null;
  upah_borongan?: number | null;
  over_target?: number | null;
  total_gaji_b?: number | null;
  potongan_masuk_jam?: number | null;
  potongan?: number | null;
  potongan_lain_lain?: number | null;
  lain_lain?: number | null;
  total_gaji_bersih?: number | null;
  no_rekening?: string | null;
  no_whatsapp?: string | null;
  [key: string]: unknown;
}

export interface PayslipRecord {
  id: number;
  period_month: number;
  period_year: number;
  period_label: string;
  data: PayslipData;
  uploaded_at: string;
}

export interface AttendanceSummary {
  totalMasuk: number;
  totalTerlambat: number;
  totalLemburMenit: number;
}

