export function formatBDT(amount: number): string {
  if (amount >= 10_000_000) return `৳${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000) return `৳${(amount / 100_000).toFixed(2)} Lakh`;
  return `৳${amount.toLocaleString("en-BD")}`;
}
