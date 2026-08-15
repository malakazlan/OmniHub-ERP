import { emptyTripForm } from "@/components/transport/transportConstants";

export function calcTripTotalCharges(form) {
  return (
    (parseFloat(form.freightCharges) || 0) +
    (parseFloat(form.loadingCharges) || 0) +
    (parseFloat(form.unloadingCharges) || 0) +
    (parseFloat(form.tollCharges) || 0) +
    (parseFloat(form.otherCharges) || 0)
  );
}

export function mapTransportToForm(transport) {
  if (!transport) return { ...emptyTripForm };
  return {
    vehicleId: transport.vehicleId ? String(transport.vehicleId) : "",
    vehicleNumber: transport.vehicleNumber || "",
    driverName: transport.driverName || "",
    driverPhone: transport.driverPhone || "",
    originCity: transport.originCity || "",
    originAddress: transport.originAddress || "",
    destinationCity: transport.destinationCity || "",
    destinationAddress: transport.destinationAddress || "",
    loadWeight: transport.loadWeight ? String(transport.loadWeight) : "",
    loadDescription: transport.loadDescription || "",
    freightCharges: transport.freightCharges ? String(transport.freightCharges) : "",
    loadingCharges: transport.loadingCharges ? String(transport.loadingCharges) : "",
    unloadingCharges: transport.unloadingCharges ? String(transport.unloadingCharges) : "",
    tollCharges: transport.tollCharges ? String(transport.tollCharges) : "",
    otherCharges: transport.otherCharges ? String(transport.otherCharges) : "",
    status: transport.status || "pending",
    dispatchDate: transport.dispatchDate ? transport.dispatchDate.slice(0, 10) : "",
    deliveryDate: transport.deliveryDate ? transport.deliveryDate.slice(0, 10) : "",
    notes: transport.notes || "",
  };
}

export function summarizeTrips(transports = []) {
  const inTransit = transports.filter((t) => t.status === "in_transit").length;
  const delivered = transports.filter((t) => t.status === "delivered").length;
  const pending = transports.filter((t) => t.status === "pending").length;
  const totalCharges = transports.reduce((s, t) => s + (t.totalCharges || 0), 0);
  const totalWeight = transports.reduce((s, t) => s + (t.loadWeight || 0), 0);
  return { total: transports.length, inTransit, delivered, pending, totalCharges, totalWeight };
}

export function validateTripStep(step, form) {
  if (step === "vehicle") {
    if (!form.driverName?.trim()) return "Driver name is required";
    return null;
  }
  if (step === "route") {
    if (!form.originCity?.trim() || !form.destinationCity?.trim()) {
      return "Origin and destination cities are required";
    }
    return null;
  }
  return null;
}

export function tripBalanceDue(trip) {
  return Math.max((trip?.totalCharges || 0) - (trip?.paidAmount || 0), 0);
}

export function tripPaymentLabel(trip) {
  const status = trip?.paymentStatus || "unpaid";
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial";
  return "Unpaid";
}
