-- ========================================================
-- SCHEMA DEFINITION FOR EMPLOYEE ATTENDANCE SYSTEM
-- Paste this script into the Supabase SQL Editor.
-- This script does a clean drop and recreate of the schema.
-- ========================================================

-- 0. Clean wipe of users and schema to prevent orphan records
-- (Safe to run multiple times, keeps only the seed admin user)
delete from auth.users where email != 'arif.setiawan2209@gmail.com';

drop schema if exists public cascade;
create schema public;

-- Grant essential Supabase schema and default privileges
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table (extends auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    nik text unique not null,
    full_name text not null,
    role text not null check (role in ('user', 'admin')) default 'user',
    passcode text not null default '123456',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- Profiles RLS Policies
create policy "Users can read their own profiles" 
    on public.profiles for select 
    using (auth.uid() = id);

create policy "Admins can read all profiles" 
    on public.profiles for select 
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

create policy "Admins can insert/update profiles" 
    on public.profiles for all 
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );


-- 2. Create Geofence Settings Table (Single-row configuration)
create table public.geofence_settings (
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
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Geofence Settings
alter table public.geofence_settings enable row level security;

-- Geofence Settings RLS Policies
create policy "Anyone can read geofence settings" 
    on public.geofence_settings for select 
    using (true);

create policy "Only admins can update geofence settings" 
    on public.geofence_settings for all 
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Insert default single config row
insert into public.geofence_settings (id, factory_lat, factory_lon, radius_meters, saturday_work_start_time, saturday_work_end_time)
values (1, -7.7828, 110.3608, 50, '08:00:00', '12:00:00')
on conflict (id) do nothing;


-- 3. Create Attendance Logs Table
create table public.attendance_logs (
    id bigint generated always as identity primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    check_in timestamp with time zone default timezone('utc'::text, now()) not null,
    check_out timestamp with time zone,
    status text not null,
    latitude numeric not null,
    longitude numeric not null
);

-- Enable RLS on Attendance Logs
alter table public.attendance_logs enable row level security;

-- Attendance Logs RLS Policies
create policy "Users can read their own logs" 
    on public.attendance_logs for select 
    using (auth.uid() = user_id);

create policy "Users can insert their own logs" 
    on public.attendance_logs for insert 
    with check (auth.uid() = user_id);

create policy "Users can update their own logs" 
    on public.attendance_logs for update 
    using (auth.uid() = user_id);

create policy "Admins can read all logs" 
    on public.attendance_logs for select 
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

create policy "Admins can perform any operation on logs" 
    on public.attendance_logs for all 
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );


-- 4. User Signup Trigger (auth.users -> public.profiles)
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
    -- Extract values from user metadata
    v_nik := coalesce(new.raw_user_meta_data->>'nik', 'NIK-' || to_char(now(), 'YYYYMMDDHH24MISS'));
    v_full_name := coalesce(new.raw_user_meta_data->>'full_name', 'Employee');
    v_role := coalesce(new.raw_user_meta_data->>'role', 'user');
    v_passcode := coalesce(new.raw_user_meta_data->>'passcode', '123456');

    insert into public.profiles (id, nik, full_name, role, passcode)
    values (new.id, v_nik, v_full_name, v_role, v_passcode);
    
    return new;
end;
$$ language plpgsql;

-- Re-create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Automatically confirm email upon signup to bypass Supabase's email confirmation setting
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


-- 5. Geofencing Calculation & Attendance Logging RPC Function
create or replace function public.log_attendance(
  p_user_id uuid,
  p_lat numeric,
  p_lon numeric,
  p_type text
)
returns json
security definer
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
  if v_factory_lat is null then
    v_factory_lat := -7.7828;
    v_factory_lon := 110.3608;
    v_radius := 50;
  end if;
  if v_work_start is null then
    v_work_start := '08:00:00'::time;
  end if;
  if v_saturday_work_start is null then
    v_saturday_work_start := '08:00:00'::time;
  end if;
  if v_tolerance is null then
    v_tolerance := 15;
  end if;

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
      -- Check if they already checked out today
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

    update public.attendance_logs
    set check_out = v_now,
        status = 'Sudah Pulang'
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
-- ADMIN ACTIONS: UPDATE, DELETE, AND CREATE USER
-- ========================================================

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
as $$
declare
  v_email text;
begin
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

  -- 3. Update auth.identities to keep email provider in sync
  update auth.identities
  set identity_data = json_build_object('sub', p_user_id::text, 'email', v_email)::jsonb,
      updated_at = now()
  where user_id = p_user_id;

  return json_build_object('success', true, 'message', 'Karyawan berhasil diperbarui.');
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
as $$
begin
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
as $$
declare
  v_deleted_count integer;
begin
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
as $$
declare
  v_user_id uuid;
  v_email text;
  v_encrypted_password text;
begin
  v_email := p_nik || '@pabrik.com';
  
  -- Check if user already exists
  select id into v_user_id from auth.users where email = v_email;
  
  if v_user_id is not null then
    return json_build_object('success', false, 'message', 'Karyawan dengan NIK ini sudah terdaftar.');
  end if;

  -- Generate new random UUID
  v_user_id := gen_random_uuid();
  
  -- Encrypt password
  v_encrypted_password := extensions.crypt(p_passcode, extensions.gen_salt('bf'));

  -- Insert into auth.users (including default GoTrue token columns)
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

  -- Insert into auth.identities with UUID type for id & email_verified property
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

  -- Insert or update public.profiles
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


-- ========================================================
-- SEED DEFAULT ADMIN USER & FORCE PROFILE
-- Email: arif.setiawan2209@gmail.com
-- Password: palamana
-- ========================================================
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- 1. Check if user already exists
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'arif.setiawan2209@gmail.com';

  -- 2. If they don't exist, create them
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

    -- Insert into auth.identities
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
    -- 3. If they exist, update password and metadata
    UPDATE auth.users
    SET encrypted_password = extensions.crypt('palamana', extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = '{"full_name":"Arif Setiawan","nik":"ADMIN-01","role":"admin"}'::jsonb,
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = now()
    WHERE id = v_admin_id;
  END IF;

  -- 4. Force upsert their public profile as admin!
  INSERT INTO public.profiles (id, nik, full_name, role, passcode, created_at)
  VALUES (v_admin_id, 'ADMIN-01', 'Arif Setiawan', 'admin', 'palamana', now())
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      nik = 'ADMIN-01',
      full_name = 'Arif Setiawan',
      passcode = 'palamana';
END $$;


-- ========================================================
-- Debug Get User Details (Inspects raw auth user columns)
-- ========================================================
create or replace function public.debug_get_user_details(p_email text)
returns json
security definer
as $$
declare
  v_user record;
  v_identity record;
begin
  select * into v_user from auth.users where email = p_email;
  select * into v_identity from auth.identities where user_id = v_user.id;
  
  return json_build_object(
    'user', row_to_json(v_user),
    'identity', row_to_json(v_identity)
  );
end;
$$ language plpgsql;
