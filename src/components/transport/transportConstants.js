import { Truck, MapPin, Package, ClipboardCheck } from "lucide-react";

export const TRANSPORT_STATUS_META = {
  pending: { label: "Pending", tone: "pending" },
  in_transit: { label: "In transit", tone: "transit" },
  delivered: { label: "Delivered", tone: "delivered" },
  cancelled: { label: "Cancelled", tone: "cancelled" },
};

export const TRANSPORT_STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_transit", label: "In transit" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

export const CHARGE_FIELDS = [
  { key: "freightCharges", label: "Freight" },
  { key: "loadingCharges", label: "Loading" },
  { key: "unloadingCharges", label: "Unloading" },
  { key: "tollCharges", label: "Toll" },
  { key: "otherCharges", label: "Other" },
];

export const TRIP_FORM_STEPS = [
  { key: "vehicle", label: "Vehicle & driver", icon: Truck },
  { key: "route", label: "Route", icon: MapPin },
  { key: "load", label: "Load & charges", icon: Package },
  { key: "review", label: "Review", icon: ClipboardCheck },
];

export const emptyTripForm = {
  vehicleId: "",
  vehicleNumber: "",
  driverName: "",
  driverPhone: "",
  originCity: "",
  originAddress: "",
  destinationCity: "",
  destinationAddress: "",
  loadWeight: "",
  loadDescription: "",
  freightCharges: "",
  loadingCharges: "",
  unloadingCharges: "",
  tollCharges: "",
  otherCharges: "",
  status: "pending",
  dispatchDate: "",
  deliveryDate: "",
  notes: "",
};
