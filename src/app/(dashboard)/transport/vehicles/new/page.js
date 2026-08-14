import { redirect } from "next/navigation";

export default function VehicleRegisterRedirect() {
  redirect("/transport/vehicles?register=1");
}
