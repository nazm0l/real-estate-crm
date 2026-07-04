// Accepts: 01712345678, +8801712345678, 8801712345678, 017-1234-5678
// Normalizes to: 8801712345678
export function normalizeBDPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let normalized: string;
  if (digits.startsWith("880") && digits.length === 13) normalized = digits;
  else if (digits.startsWith("0") && digits.length === 11) normalized = "88" + digits;
  else if (digits.length === 10 && digits.startsWith("1")) normalized = "880" + digits;
  else return null;

  // Valid BD mobile operator prefixes: 013-019
  const operatorDigit = normalized[4];
  if (!"3456789".includes(operatorDigit)) return null;
  return normalized;
}

export function displayBDPhone(normalized: string): string {
  // 8801712345678 → 01712-345678
  const local = "0" + normalized.slice(3);
  return `${local.slice(0, 5)}-${local.slice(5)}`;
}

export function whatsappLink(normalized: string): string {
  return `https://wa.me/${normalized}`;
}
