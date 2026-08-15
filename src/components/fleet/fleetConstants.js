import { Fuel, Wrench, Hammer, Shield, FileText } from "lucide-react";

export const VEHICLE_TYPES = ["truck", "pickup", "trailer", "dumper", "van", "other"];

export const EXPENSE_TYPES = [
  { key: "fuel", label: "Fuel", icon: Fuel },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "repair", label: "Repair", icon: Hammer },
  { key: "insurance", label: "Insurance", icon: Shield },
  { key: "other", label: "Other", icon: FileText },
];

export const EXPENSE_FILTER_ALL = "all";

export const emptyVehicleForm = {
  registrationNumber: "",
  vehicleType: "truck",
  make: "",
  model: "",
  year: "",
  capacity: "",
  driverName: "",
  driverPhone: "",
  isOwned: true,
  isActive: true,
  notes: "",
};

export const emptyExpenseForm = {
  vehicleId: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  expenseType: "fuel",
  amount: "",
  description: "",
  paymentChannel: "cash",
  accountId: "",
  notes: "",
};
