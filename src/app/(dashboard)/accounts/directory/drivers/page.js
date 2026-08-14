import { redirect } from "next/navigation";

export default function DriversRedirect() {
  redirect("/accounts?category=transport");
}
