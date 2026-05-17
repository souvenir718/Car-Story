"use client";

import { deleteRow, isSupabaseConfigured, listRows, upsertRows } from "./supabase";
import type {
  AppSettings,
  DriveLog,
  DriveLogRow,
  FuelLog,
  FuelLogRow,
} from "./types";

const legacyDriveStorageKey = "vehicle-log-mvp:drive-logs";
const legacyFuelStorageKey = "vehicle-log-mvp:fuel-logs";
const legacySettingsStorageKey = "vehicle-log-mvp:settings";
const legacyMigrationStorageKey = "vehicle-log-mvp:supabase-migrated";

const driveStorageKey = "carstory:drive-logs";
const fuelStorageKey = "carstory:fuel-logs";
const settingsStorageKey = "carstory:settings";
const migrationStorageKey = "carstory:supabase-migrated";

export const defaultSettings: AppSettings = {
  centerName: "봉담지역아동센터",
  vehicleName: "",
  driverName: "",
};

const toDriveLog = (row: DriveLogRow): DriveLog => ({
  id: row.id,
  date: row.date,
  passengerName: row.passenger_name ?? "",
  passengerCount: row.passenger_count ?? 1,
  destination: row.destination ?? "",
  purpose: row.purpose ?? "",
  startTime: (row.start_time ?? "").slice(0, 5),
  endTime: (row.end_time ?? "").slice(0, 5),
  startOdometer: row.start_odometer ?? 0,
  endOdometer: row.end_odometer ?? 0,
  distance: row.distance ?? 0,
  memo: row.memo ?? "",
  createdAt: row.created_at,
});

const toFuelLog = (row: FuelLogRow): FuelLog => ({
  id: row.id,
  date: row.date,
  fuelAmount: row.fuel_amount ?? 0,
  amount: row.amount ?? 0,
  odometer: row.odometer ?? 0,
  memo: row.memo ?? "",
  createdAt: row.created_at,
});

const readLocal = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

const writeLocal = <T>(key: string, value: T) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const migrateLocalKey = (fromKey: string, toKey: string) => {
  if (typeof window === "undefined" || window.localStorage.getItem(toKey)) {
    return;
  }

  const legacyValue = window.localStorage.getItem(fromKey);
  if (legacyValue) {
    window.localStorage.setItem(toKey, legacyValue);
  }
};

const migrateLegacyLocalData = () => {
  migrateLocalKey(legacyDriveStorageKey, driveStorageKey);
  migrateLocalKey(legacyFuelStorageKey, fuelStorageKey);
  migrateLocalKey(legacySettingsStorageKey, settingsStorageKey);
  migrateLocalKey(legacyMigrationStorageKey, migrationStorageKey);
};

export const getSettings = () => {
  migrateLegacyLocalData();
  const settings = readLocal<AppSettings>(settingsStorageKey, defaultSettings);

  return {
    centerName:
      !settings.centerName || settings.centerName === "센터명"
        ? defaultSettings.centerName
        : settings.centerName,
    vehicleName:
      settings.vehicleName === "차량명"
        ? defaultSettings.vehicleName
        : settings.vehicleName,
    driverName:
      settings.driverName === "운전자"
        ? defaultSettings.driverName
        : settings.driverName,
  };
};

export const saveSettings = (settings: AppSettings) => {
  writeLocal(settingsStorageKey, settings);
};

export const syncLocalDataToSupabase = async () => {
  migrateLegacyLocalData();

  if (!isSupabaseConfigured) {
    return;
  }

  const wasMigrated = readLocal<boolean>(migrationStorageKey, false);
  if (wasMigrated) {
    return;
  }

  const driveLogs = readLocal<DriveLog[]>(driveStorageKey, []);
  const fuelLogs = readLocal<FuelLog[]>(fuelStorageKey, []);

  if (driveLogs.length > 0) {
    await upsertRows(
      "drive_logs",
      driveLogs.map((log) => ({
        id: log.id,
        date: log.date,
        passenger_name: log.passengerName,
        passenger_count: log.passengerCount,
        destination: log.destination,
        purpose: log.purpose,
        start_time: log.startTime || null,
        end_time: log.endTime || null,
        start_odometer: log.startOdometer,
        end_odometer: log.endOdometer,
        distance: log.distance,
        memo: log.memo,
        created_at: log.createdAt,
      })),
    );
  }

  if (fuelLogs.length > 0) {
    await upsertRows(
      "fuel_logs",
      fuelLogs.map((log) => ({
        id: log.id,
        date: log.date,
        fuel_amount: log.fuelAmount,
        amount: log.amount,
        odometer: log.odometer,
        memo: log.memo,
        created_at: log.createdAt,
      })),
    );
  }

  writeLocal(migrationStorageKey, true);
};

export const listDriveLogs = async (): Promise<DriveLog[]> => {
  migrateLegacyLocalData();

  if (isSupabaseConfigured) {
    const rows = await listRows<DriveLogRow>("drive_logs", "date.desc,start_time.desc");
    return rows.map(toDriveLog);
  }

  return readLocal<DriveLog[]>(driveStorageKey, []).sort((a, b) =>
    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`),
  );
};

export const saveDriveLog = async (log: DriveLog) => {
  migrateLegacyLocalData();

  if (isSupabaseConfigured) {
    await upsertRows("drive_logs", {
      id: log.id,
      date: log.date,
      passenger_name: log.passengerName,
      passenger_count: log.passengerCount,
      destination: log.destination,
      purpose: log.purpose,
      start_time: log.startTime || null,
      end_time: log.endTime || null,
      start_odometer: log.startOdometer,
      end_odometer: log.endOdometer,
      distance: log.distance,
      memo: log.memo,
      created_at: log.createdAt,
    });
    return;
  }

  const logs = readLocal<DriveLog[]>(driveStorageKey, []);
  const nextLogs = [log, ...logs.filter((item) => item.id !== log.id)];
  writeLocal(driveStorageKey, nextLogs);
};

export const deleteDriveLog = async (id: string) => {
  migrateLegacyLocalData();

  if (isSupabaseConfigured) {
    await deleteRow("drive_logs", id);
    return;
  }

  const logs = readLocal<DriveLog[]>(driveStorageKey, []);
  writeLocal(
    driveStorageKey,
    logs.filter((item) => item.id !== id),
  );
};

export const listFuelLogs = async (): Promise<FuelLog[]> => {
  migrateLegacyLocalData();

  if (isSupabaseConfigured) {
    const rows = await listRows<FuelLogRow>("fuel_logs", "date.desc");
    return rows.map(toFuelLog);
  }

  return readLocal<FuelLog[]>(fuelStorageKey, []).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
};

export const saveFuelLog = async (log: FuelLog) => {
  migrateLegacyLocalData();

  if (isSupabaseConfigured) {
    await upsertRows("fuel_logs", {
      id: log.id,
      date: log.date,
      fuel_amount: log.fuelAmount,
      amount: log.amount,
      odometer: log.odometer,
      memo: log.memo,
      created_at: log.createdAt,
    });
    return;
  }

  const logs = readLocal<FuelLog[]>(fuelStorageKey, []);
  const nextLogs = [log, ...logs.filter((item) => item.id !== log.id)];
  writeLocal(fuelStorageKey, nextLogs);
};

export const deleteFuelLog = async (id: string) => {
  migrateLegacyLocalData();

  if (isSupabaseConfigured) {
    await deleteRow("fuel_logs", id);
    return;
  }

  const logs = readLocal<FuelLog[]>(fuelStorageKey, []);
  writeLocal(
    fuelStorageKey,
    logs.filter((item) => item.id !== id),
  );
};
