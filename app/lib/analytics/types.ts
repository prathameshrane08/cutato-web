export type AnalyticsRange = "7d" | "30d" | "90d" | "year";

export type RevenuePoint = {
  label: string;
  revenue: number;
  bookings: number;
};

export type StatusPoint = {
  name: string;
  value: number;
};

export type ServicePoint = {
  name: string;
  bookings: number;
  revenue: number;
};

export type BarberPoint = {
  name: string;
  bookings: number;
  revenue: number;
};
