/** Aggregate vehicle expense rows into per-vehicle and fleet totals. */
export function aggregateFleetExpenses(expenses, monthStart = null) {
  const start =
    monthStart ||
    (() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

  const byVehicle = {};
  let fleetMonth = 0;
  let fleetAllTime = 0;

  for (const e of expenses) {
    const vid = e.vehicleId;
    if (!byVehicle[vid]) {
      byVehicle[vid] = { total: 0, month: 0, fuel: 0, count: 0 };
    }
    const amt = Number(e.amount) || 0;
    byVehicle[vid].total += amt;
    byVehicle[vid].count += 1;
    fleetAllTime += amt;

    const d = new Date(e.expenseDate);
    if (d >= start) {
      byVehicle[vid].month += amt;
      fleetMonth += amt;
    }
    if (e.expenseType === "fuel") {
      byVehicle[vid].fuel += amt;
    }
  }

  return { byVehicle, fleetMonth, fleetAllTime };
}

export function vehicleLabel(vehicle) {
  if (!vehicle) return "";
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return makeModel || vehicle.vehicleType || "Vehicle";
}
