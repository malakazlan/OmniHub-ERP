/**
 * Compose a single-line US-style mailing address from company profile settings.
 * Example: "100 Commerce Way, Suite 200, Columbus, OH 43215"
 */
export function companyAddressLine(company = {}) {
  const street = (company.company_address || company.address || "").trim();
  const city = (company.company_city || company.city || "").trim();
  const state = (company.company_state || company.state || "").trim();
  const zip = (company.company_zip || company.zip || "").trim();
  const stateZip = [state, zip].filter(Boolean).join(" ");
  return [street, city, stateZip].filter(Boolean).join(", ");
}
