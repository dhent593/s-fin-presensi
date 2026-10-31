-- ========================================================
-- SCHEMA DEFINITION FOR EMPLOYEE ATTENDANCE SYSTEM (S-FIN)
-- Paste this script into the Supabase SQL Editor.
-- This script is IDEMPOTENT and SAFE for existing databases,
-- while also supporting clean initial setups.
-- ========================================================

-- Enable essential extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Grant essential Supabase schema privileges
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;


-- ========================================================
-- 1. PROFILES TABLE (Extends auth.users)
-- ========================================================
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    nik text unique not null,
    full_name text not null,
    role text not null check (role in ('user', 'admin')) default 'user',
    passcode text not null default '123456',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Helper security function: Check if current caller is an Admin
-- Marked SECURITY DEFINER to bypass RLS recursion safely
create or replace function public.is_admin()
returns boolean
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql;

-- Profiles RLS Policies
drop policy if exists "Users can read their own profiles" on public.profiles;
create policy "Users can read their own profiles" 
    on public.profiles for select 
    using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" 
    on public.profiles for select 
    using (public.is_admin());

drop policy if exists "Admins can insert/update profiles" on public.profiles;
create policy "Admins can insert/update profiles" 
    on public.profiles for all 
    using (public.is_admin());


-- ========================================================
-- 2. GEOFENCE & OFFICE SETTINGS TABLE
-- ========================================================
create table if not exists public.geofence_settings (
    id integer primary key check (id = 1) default 1,
    factory_lat numeric not null default -7.7828,
    factory_lon numeric not null default 110.3608,
    radius_meters integer not null default 50,
    work_start_time time without time zone not null default '08:00:00',
    work_end_time time without time zone not null default '17:00:00',
    saturday_work_start_time time without time zone not null default '08:00:00',
    saturday_work_end_time time without time zone not null default '12:00:00',
    break_start_time time without time zone not null default '12:00:00',
    break_end_time time without time zone not null default '13:00:00',
    late_tolerance_minutes integer not null default 15,
    overtime_threshold_minutes integer not null default 30,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Idempotent column additions for existing databases
alter table public.geofence_settings add column if not exists saturday_work_start_time time without time zone not null default '08:00:00';
alter table public.geofence_settings add column if not exists saturday_work_end_time time without time zone not null default '12:00:00';
alter table public.geofence_settings add column if not exists break_start_time time without time zone not null default '12:00:00';
alter table public.geofence_settings add column if not exists break_end_time time without time zone not null default '13:00:00';
alter table public.geofence_settings add column if not exists late_tolerance_minutes integer not null default 15;
alter table public.geofence_settings add column if not exists overtime_threshold_minutes integer not null default 30;

alter table public.geofence_settings enable row level security;

drop policy if exists "Anyone can read geofence settings" on public.geofence_settings;
create policy "Anyone can read geofence settings" 
    on public.geofence_settings for select 
    using (true);

drop policy if exists "Only admins can update geofence settings" on public.geofence_settings;
create policy "Only admins can update geofence settings" 
    on public.geofence_settings for all 
    using (public.is_admin());

-- Insert default single config row if missing
insert into public.geofence_settings (id, factory_lat, factory_lon, radius_meters, work_start_time, work_end_time, saturday_work_start_time, saturday_work_end_time, break_start_time, break_end_time, late_tolerance_minutes, overtime_threshold_minutes)
values (1, -7.7828, 110.3608, 50, '08:00:00', '17:00:00', '08:00:00', '12:00:00', '12:00:00', '13:00:00', 15, 30)
on conflict (id) do nothing;


-- ========================================================
-- 3. ATTENDANCE LOGS TABLE
-- ========================================================
create table if not exists public.attendance_logs (
    id bigint generated always as identity primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    check_in timestamp with time zone default timezone('utc'::text, now()) not null,
    check_out timestamp with time zone,
    status text not null,
    latitude numeric default -7.7828,
    longitude numeric default 110.3608,
    break_start timestamp with time zone,
    break_end timestamp with time zone,
    notes text
);

-- Idempotent column additions for existing databases
alter table public.attendance_logs add column if not exists break_start timestamp with time zone;
alter table public.attendance_logs add column if not exists break_end timestamp with time zone;
alter table public.attendance_logs add column if not exists notes text;
-- Relax NOT NULL constraint on latitude & longitude to support auto-generated leave attendance
alter table public.attendance_logs alter column latitude drop not null;
alter table public.attendance_logs alter column longitude drop not null;

-- Indexes for lightning fast monthly recap and history queries
create index if not exists idx_attendance_logs_user_checkin on public.attendance_logs(user_id, check_in desc);
create index if not exists idx_attendance_logs_checkin on public.attendance_logs(check_in);

alter table public.attendance_logs enable row level security;

drop policy if exists "Users can read their own logs" on public.attendance_logs;
drop policy if exists "Users can insert their own logs" on public.attendance_logs;
drop policy if exists "Users can update their own logs" on public.attendance_logs;
drop policy if exists "Admins can read all logs" on public.attendance_logs;
drop policy if exists "Admins can perform any operation on logs" on public.attendance_logs;

create policy "Users can read their own logs" 
    on public.attendance_logs for select 
    using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert their own logs" 
    on public.attendance_logs for insert 
    with check (auth.uid() = user_id or public.is_admin());

create policy "Users can update their own logs" 
    on public.attendance_logs for update 
    using (auth.uid() = user_id or public.is_admin());

create policy "Admins can delete logs" 
    on public.attendance_logs for delete 
    using (public.is_admin());


-- ========================================================
-- 4. NOTIFICATIONS TABLE (Information Center)
-- ========================================================
create table if not exists public.notifications (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now() not null,
    title text not null,
    message text not null,
    type text default 'info', -- 'info', 'warning', 'success'
    target_user_id uuid references public.profiles(id) on delete cascade null, -- null = broadcast to all
    is_active boolean default true
);

create index if not exists idx_notifications_active_target on public.notifications(is_active, target_user_id);

alter table public.notifications enable row level security;

drop policy if exists "Employees can read their notifications" on public.notifications;
drop policy if exists "Admins have full access to notifications" on public.notifications;

create policy "Employees can read their notifications"
    on public.notifications for select
    using (
        (is_active = true and (target_user_id is null or target_user_id = auth.uid()))
        or public.is_admin()
    );

create policy "Admins have full access to notifications"
    on public.notifications for all
    using (public.is_admin());


-- ========================================================
-- 5. LEAVE REQUESTS TABLE (Pengajuan Izin, Sakit, Cuti)
-- ========================================================
create table if not exists public.leave_requests (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    type text not null default 'Izin', -- 'Izin', 'Sakit', 'Cuti'
    start_date date not null,
    end_date date not null,
    reason text not null,
    status text not null default 'Pending', -- 'Pending', 'Approved', 'Rejected'
    created_at timestamptz default now() not null
);

create index if not exists idx_leave_requests_user_created on public.leave_requests(user_id, created_at desc);

alter table public.leave_requests enable row level security;

drop policy if exists "Users can read their own leave requests" on public.leave_requests;
create policy "Users can read their own leave requests"
    on public.leave_requests for select
    using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert their own leave requests" on public.leave_requests;
create policy "Users can insert their own leave requests"
    on public.leave_requests for insert
    with check (auth.uid() = user_id);

drop policy if exists "Admins can update leave requests" on public.leave_requests;
create policy "Admins can update leave requests"
    on public.leave_requests for update
    using (public.is_admin());

drop policy if exists "Admins and owners can delete leave requests" on public.leave_requests;
create policy "Admins and owners can delete leave requests"
    on public.leave_requests for delete
    using (public.is_admin() or (auth.uid() = user_id and status = 'Pending'));


-- ========================================================
-- 6. PAYSLIPS TABLE (Slip Gaji Karyawan)
-- ========================================================
create table if not exists public.payslips (
    id bigint generated always as identity primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    nik text not null,
    period_month integer not null check (period_month between 1 and 12),
    period_year integer not null,
    period_label text not null default 'Awal', -- 'Awal' or 'Akhir'
    data jsonb not null default '{}'::jsonb,
    uploaded_by uuid references public.profiles(id) on delete set null,
    uploaded_at timestamptz default now() not null,
    constraint uq_payslip_period unique (user_id, period_month, period_year, period_label)
);

-- Idempotent constraint addition for existing databases
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_payslip_period'
  ) then
    alter table public.payslips add constraint uq_payslip_period unique (user_id, period_month, period_year, period_label);
  end if;
end $$;

create index if not exists idx_payslips_user_period on public.payslips(user_id, period_year desc, period_month desc);
create index if not exists idx_payslips_period_group on public.payslips(period_year desc, period_month desc, period_label);

alter table public.payslips enable row level security;

drop policy if exists "Employees can read their own payslips" on public.payslips;
create policy "Employees can read their own payslips"
    on public.payslips for select
    using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins have full access to payslips" on public.payslips;
create policy "Admins have full access to payslips"
    on public.payslips for all
    using (public.is_admin());


-- ========================================================
-- 7. USER SIGNUP TRIGGER (auth.users -> public.profiles)
-- ========================================================
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
as $$
declare
    v_nik text;
    v_full_name text;
    v_role text;
    v_passcode text;
begin
    v_nik := coalesce(new.raw_user_meta_data->>'nik', 'NIK-' || to_char(now(), 'YYYYMMDDHH24MISS'));
    v_full_name := coalesce(new.raw_user_meta_data->>'full_name', 'Employee');
    v_role := coalesce(new.raw_user_meta_data->>'role', 'user');
    v_passcode := coalesce(new.raw_user_meta_data->>'passcode', '123456');

    insert into public.profiles (id, nik, full_name, role, passcode)
    values (new.id, v_nik, v_full_name, v_role, v_passcode)
    on conflict (id) do update
    set nik = excluded.nik,
        full_name = excluded.full_name,
        role = excluded.role,
        passcode = excluded.passcode;
    
    return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Automatically confirm email upon signup to bypass Supabase email confirmation requirement
create or replace function public.auto_confirm_email()
returns trigger
security definer
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created_before on auth.users;
create trigger on_auth_user_created_before
  before insert on auth.users
  for each row execute procedure public.auto_confirm_email();


-- ========================================================
-- 8. GEOFENCING & ATTENDANCE LOGGING RPC FUNCTION
-- ========================================================
create or replace function public.log_attendance(
  p_user_id uuid,
  p_lat numeric,
  p_lon numeric,
  p_type text
)
returns json
security definer
set search_path = public
as $$
declare
  v_factory_lat numeric;
  v_factory_lon numeric;
  v_radius integer;
  v_work_start time;
  v_saturday_work_start time;
  v_tolerance integer;
  v_late_limit time;
  v_distance numeric;
  v_status text;
  v_log_id bigint;
  v_now timestamp with time zone;
begin
  -- Prevent users from spoofing other employee attendance
  if auth.uid() is not null and auth.uid() != p_user_id and not public.is_admin() then
    return json_build_object(
      'success', false,
      'message', 'Gagal! Anda tidak diizinkan mencatat absensi karyawan lain.'
    );
  end if;

  v_now := now();

  -- 1. Fetch geofence and office settings
  select 
    factory_lat, 
    factory_lon, 
    radius_meters, 
    work_start_time, 
    saturday_work_start_time,
    late_tolerance_minutes 
  into 
    v_factory_lat, 
    v_factory_lon, 
    v_radius, 
    v_work_start, 
    v_saturday_work_start,
    v_tolerance
  from public.geofence_settings
  where id = 1;

  -- Fallbacks if empty
  if v_factory_lat is null then v_factory_lat := -7.7828; end if;
  if v_factory_lon is null then v_factory_lon := 110.3608; end if;
  if v_radius is null then v_radius := 50; end if;
  if v_work_start is null then v_work_start := '08:00:00'::time; end if;
  if v_saturday_work_start is null then v_saturday_work_start := '08:00:00'::time; end if;
  if v_tolerance is null then v_tolerance := 15; end if;

  -- If today is Saturday (6), override work start time
  if extract(dow from (v_now at time zone 'Asia/Jakarta')) = 6 then
    v_work_start := v_saturday_work_start;
  end if;

  -- Calculate late threshold limit (work_start + tolerance minutes)
  v_late_limit := (v_work_start + (v_tolerance || ' minutes')::interval)::time;

  -- 2. Calculate distance using Haversine formula
  v_distance := 2 * 6371000 * asin(sqrt(
    power(sin(radians(p_lat - v_factory_lat) / 2), 2) +
    cos(radians(v_factory_lat)) * cos(radians(p_lat)) *
    power(sin(radians(p_lon - v_factory_lon) / 2), 2)
  ));

  -- 3. Verify if user is inside the geofence radius
  if v_distance > v_radius then
    return json_build_object(
      'success', false,
      'message', format('Gagal! Anda berada di luar radius pabrik. Jarak Anda: %s meter (Batas: %s meter).', round(v_distance), v_radius)
    );
  end if;

  -- 4. Process check-in or check-out
  if p_type = 'Masuk' then
    -- Check if user already checked in today (WIB timezone)
    if exists (
      select 1 from public.attendance_logs
      where user_id = p_user_id 
        and (check_in at time zone 'Asia/Jakarta')::date = (v_now at time zone 'Asia/Jakarta')::date
    ) then
      return json_build_object(
        'success', false,
        'message', 'Gagal! Anda sudah melakukan absen masuk hari ini.'
      );
    end if;

    -- Determine status based on dynamic working hour settings & late tolerance
    if ((v_now at time zone 'Asia/Jakarta')::time > v_late_limit) then
      v_status := 'Terlambat';
    else
      v_status := 'Tepat Waktu';
    end if;

    insert into public.attendance_logs (user_id, check_in, status, latitude, longitude)
    values (p_user_id, v_now, v_status, p_lat, p_lon)
    returning id into v_log_id;

    return json_build_object(
      'success', true,
      'message', format('BERHASIL! Absen masuk tercatat. Status: %s', v_status)
    );

  elsif p_type = 'Pulang' then
    -- Find today's check-in log that doesn't have check_out yet
    select id into v_log_id
    from public.attendance_logs
    where user_id = p_user_id 
      and (check_in at time zone 'Asia/Jakarta')::date = (v_now at time zone 'Asia/Jakarta')::date
      and check_out is null
    order by check_in desc
    limit 1;

    if v_log_id is null then
      if exists (
        select 1 from public.attendance_logs
        where user_id = p_user_id 
          and (check_in at time zone 'Asia/Jakarta')::date = (v_now at time zone 'Asia/Jakarta')::date
          and check_out is not null
      ) then
        return json_build_object(
          'success', false,
          'message', 'Gagal! Anda sudah melakukan absen pulang hari ini.'
        );
      else
        return json_build_object(
          'success', false,
          'message', 'Gagal! Anda belum melakukan absen masuk hari ini.'
        );
      end if;
    end if;

    -- CRITICAL FIX: Update check_out but PRESERVE original status ('Tepat Waktu' / 'Terlambat')
    -- Do not overwrite status with 'Sudah Pulang' so tardiness history is retained
    update public.attendance_logs
    set check_out = v_now
    where id = v_log_id;

    return json_build_object(
      'success', true,
      'message', 'BERHASIL! Absen pulang tercatat. Hati-hati di jalan!'
    );

  else
    return json_build_object(
      'success', false,
      'message', 'Gagal! Tipe absensi tidak valid.'
    );
  end if;
end;
$$ language plpgsql;


-- ========================================================
-- 9. ADMIN ACTIONS: CREATE, UPDATE, DELETE & BATCH IMPORT
-- All functions verify caller authorization using is_admin()
-- ========================================================

-- Admin Create User Function (Bypasses Auth Rate Limits and creates Identity correctly)
create or replace function public.admin_create_user(
  p_nik text,
  p_full_name text,
  p_role text,
  p_passcode text,
  p_created_at timestamp with time zone default now()
)
returns json
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_encrypted_password text;
begin
  -- CRITICAL SECURITY: Verify caller is Admin
  if not public.is_admin() then
    return json_build_object('success', false, 'message', 'Akses ditolak: Hanya administrator yang diizinkan.');
  end if;

  v_email := p_nik || '@pabrik.com';
  
  -- Check if user already exists
  select id into v_user_id from auth.users where email = v_email;
  
  if v_user_id is not null then
    return json_build_object('success', false, 'message', format('Karyawan dengan NIK %s sudah terdaftar.', p_nik));
  end if;

  v_user_id := gen_random_uuid();
  v_encrypted_password := extensions.crypt(p_passcode, extensions.gen_salt('bf'));

  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    is_super_admin,
    role,
    aud,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    v_encrypted_password,
    now(),
    json_build_object('full_name', p_full_name, 'nik', p_nik, 'role', p_role, 'passcode', p_passcode)::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    false,
    'authenticated',
    'authenticated',
    p_created_at,
    p_created_at,
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    json_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false)::jsonb,
    'email',
    v_user_id::text,
    now(),
    p_created_at,
    p_created_at
  );

  insert into public.profiles (id, nik, full_name, role, passcode, created_at)
  values (v_user_id, p_nik, p_full_name, p_role, p_passcode, p_created_at)
  on conflict (id) do update
  set created_at = p_created_at,
      nik = p_nik,
      full_name = p_full_name,
      role = p_role,
      passcode = p_passcode;

  return json_build_object('success', true, 'message', 'Karyawan berhasil dibuat.', 'id', v_user_id);
exception
  when others then
    return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql;


-- Admin Create Users Batch (High-speed Excel Bulk Importer)
-- Imports 100+ employees in a single network round-trip!
create or replace function public.admin_create_users_batch(
  p_users jsonb
)
returns json
security definer
set search_path = public
as $$
declare
  v_user jsonb;
  v_nik text;
  v_full_name text;
  v_role text;
  v_passcode text;
  v_created_at timestamptz;
  v_user_id uuid;
  v_email text;
  v_encrypted_password text;
  v_success_count integer := 0;
  v_fail_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'message', 'Akses ditolak: Hanya administrator yang diizinkan.');
  end if;

  for v_user in select * from jsonb_array_elements(p_users)
  loop
    v_nik := trim(v_user->>'nik');
    v_full_name := trim(v_user->>'full_name');
    v_role := coalesce(v_user->>'role', 'user');
    v_passcode := coalesce(v_user->>'passcode', '123456');
    v_created_at := coalesce((v_user->>'created_at')::timestamptz, now());

    if v_nik is null or v_nik = '' or v_full_name is null or v_full_name = '' then
      v_fail_count := v_fail_count + 1;
      v_errors := v_errors || jsonb_build_object('nik', v_nik, 'error', 'Nama atau NIK kosong');
      continue;
    end if;

    v_email := v_nik || '@pabrik.com';

    -- Check if exists
    if exists (select 1 from auth.users where email = v_email) then
      v_fail_count := v_fail_count + 1;
      v_errors := v_errors || jsonb_build_object('nik', v_nik, 'error', 'NIK sudah terdaftar');
      continue;
    end if;

    begin
      v_user_id := gen_random_uuid();
      v_encrypted_password := extensions.crypt(v_passcode, extensions.gen_salt('bf'));

      insert into auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, raw_app_meta_data, is_super_admin, role, aud,
        created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        v_user_id, '00000000-0000-0000-0000-000000000000', v_email, v_encrypted_password, now(),
        json_build_object('full_name', v_full_name, 'nik', v_nik, 'role', v_role, 'passcode', v_passcode)::jsonb,
        '{"provider":"email","providers":["email"]}'::jsonb, false, 'authenticated', 'authenticated',
        v_created_at, v_created_at, '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) values (
        v_user_id, v_user_id,
        json_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false)::jsonb,
        'email', v_user_id::text, now(), v_created_at, v_created_at
      );

      insert into public.profiles (id, nik, full_name, role, passcode, created_at)
      values (v_user_id, v_nik, v_full_name, v_role, v_passcode, v_created_at)
      on conflict (id) do update
      set created_at = v_created_at, nik = v_nik, full_name = v_full_name, role = v_role, passcode = v_passcode;

      v_success_count := v_success_count + 1;
    exception
      when others then
        v_fail_count := v_fail_count + 1;
        v_errors := v_errors || jsonb_build_object('nik', v_nik, 'error', SQLERRM);
    end;
  end loop;

  return json_build_object(
    'success', true,
    'success_count', v_success_count,
    'fail_count', v_fail_count,
    'errors', v_errors,
    'message', format('Batch import selesai: %s berhasil, %s gagal/duplikat.', v_success_count, v_fail_count)
  );
end;
$$ language plpgsql;


-- Admin Update User Function
create or replace function public.admin_update_user(
  p_user_id uuid,
  p_nik text,
  p_full_name text,
  p_role text,
  p_passcode text
)
returns json
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- CRITICAL SECURITY: Verify caller is Admin
  if not public.is_admin() then
    return json_build_object('success', false, 'message', 'Akses ditolak: Hanya administrator yang diizinkan.');
  end if;

  v_email := p_nik || '@pabrik.com';

  -- 1. Update public.profiles
  update public.profiles
  set nik = p_nik,
      full_name = p_full_name,
      role = p_role,
      passcode = p_passcode
  where id = p_user_id;

  -- 2. Update auth.users
  update auth.users
  set email = v_email,
      encrypted_password = extensions.crypt(p_passcode, extensions.gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object(
        'nik', p_nik,
        'full_name', p_full_name,
        'role', p_role,
        'passcode', p_passcode
      ),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at = now()
  where id = p_user_id;

  -- 3. Update auth.identities
  update auth.identities
  set identity_data = json_build_object('sub', p_user_id::text, 'email', v_email)::jsonb,
      updated_at = now()
  where user_id = p_user_id;

  return json_build_object('success', true, 'message', 'Data karyawan berhasil diperbarui.');
exception
  when others then
    return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql;


-- Admin Delete User Function
create or replace function public.admin_delete_user(
  p_user_id uuid
)
returns json
security definer
set search_path = public
as $$
begin
  -- CRITICAL SECURITY: Verify caller is Admin
  if not public.is_admin() then
    return json_build_object('success', false, 'message', 'Akses ditolak: Hanya administrator yang diizinkan.');
  end if;

  -- Delete from auth.users (cascades automatically to public.profiles)
  delete from auth.users where id = p_user_id;

  return json_build_object('success', true, 'message', 'Karyawan berhasil dihapus.');
exception
  when others then
    return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql;


-- Admin Reset All Users (excluding admins)
create or replace function public.admin_reset_all_users()
returns json
security definer
set search_path = public
as $$
declare
  v_deleted_count integer;
begin
  -- CRITICAL SECURITY: Verify caller is Admin
  if not public.is_admin() then
    return json_build_object('success', false, 'message', 'Akses ditolak: Hanya administrator yang diizinkan.');
  end if;

  -- Delete from auth.users for users whose profile role is 'user'
  delete from auth.users 
  where id in (
    select id from public.profiles where role = 'user'
  );
  
  get diagnostics v_deleted_count = row_count;

  return json_build_object(
    'success', true, 
    'message', format('Berhasil menghapus %s karyawan.', v_deleted_count)
  );
exception
  when others then
    return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql;


-- ========================================================
-- 10. SEED DEFAULT ADMIN USER
-- Email: arif.setiawan2209@gmail.com
-- Password: palamana
-- NIK: ADMIN-01
-- ========================================================
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'arif.setiawan2209@gmail.com';

  IF v_admin_id IS NULL THEN
    v_admin_id := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'arif.setiawan2209@gmail.com',
      extensions.crypt('palamana', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Arif Setiawan","nik":"ADMIN-01","role":"admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_admin_id,
      v_admin_id,
      json_build_object('sub', v_admin_id::text, 'email', 'arif.setiawan2209@gmail.com')::jsonb,
      'email',
      v_admin_id::text,
      now(),
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = extensions.crypt('palamana', extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = '{"full_name":"Arif Setiawan","nik":"ADMIN-01","role":"admin"}'::jsonb,
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = now()
    WHERE id = v_admin_id;
  END IF;

  INSERT INTO public.profiles (id, nik, full_name, role, passcode, created_at)
  VALUES (v_admin_id, 'ADMIN-01', 'Arif Setiawan', 'admin', 'palamana', now())
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      nik = 'ADMIN-01',
      full_name = 'Arif Setiawan',
      passcode = 'palamana';
END $$;
