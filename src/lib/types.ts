export type DriveLog = {
  id: string;
  date: string;
  passengerName: string;
  passengerCount: number;
  destination: string;
  purpose: string;
  startTime: string;
  endTime: string;
  startOdometer: number;
  endOdometer: number;
  distance: number;
  memo: string;
  createdAt: string;
};

export type FuelLog = {
  id: string;
  date: string;
  fuelAmount: number;
  amount: number;
  odometer: number;
  memo: string;
  createdAt: string;
};

export type AppSettings = {
  centerName: string;
  vehicleName: string;
  driverName: string;
};

export type DriveLogRow = {
  id: string;
  date: string;
  passenger_name: string | null;
  passenger_count: number | null;
  destination: string | null;
  purpose: string | null;
  start_time: string | null;
  end_time: string | null;
  start_odometer: number | null;
  end_odometer: number | null;
  distance: number | null;
  memo: string | null;
  created_at: string;
};

export type FuelLogRow = {
  id: string;
  date: string;
  fuel_amount: number | null;
  amount: number | null;
  odometer: number | null;
  memo: string | null;
  created_at: string;
};
