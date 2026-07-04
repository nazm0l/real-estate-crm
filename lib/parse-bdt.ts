// Parses free-text BDT budget input into a plain number.
// Accepts: "25 lakh", "1.2 crore", "2500000", "25,00,000"
export function parseBDTInput(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const match = trimmed.match(/^([\d,.]+)\s*(lakh|lac|l|crore|cr)?$/);
  if (!match) return null;

  const numeric = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const unit = match[2];
  if (unit === "lakh" || unit === "lac" || unit === "l") return numeric * 100_000;
  if (unit === "crore" || unit === "cr") return numeric * 10_000_000;
  return numeric;
}
