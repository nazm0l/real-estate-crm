// Meta ad account spend is reported in USD — never route it through formatBDT(),
// which is for the CRM's own BDT-denominated figures (property prices, payments).
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
