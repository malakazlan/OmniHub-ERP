const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ""}`.trim();
}

function threeDigits(n) {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const head = h ? `${ONES[h]} Hundred` : "";
  const tail = rest ? twoDigits(rest) : "";
  return [head, tail].filter(Boolean).join(" ");
}

function integerToWords(n) {
  if (n === 0) return "Zero";
  const parts = [];
  const billion = Math.floor(n / 1000000000);
  n %= 1000000000;
  const million = Math.floor(n / 1000000);
  n %= 1000000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  if (billion) parts.push(`${threeDigits(billion)} Billion`);
  if (million) parts.push(`${threeDigits(million)} Million`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * US dollar amount in words (English), e.g. for bill footers.
 */
export function amountInWords(amount) {
  const num = Math.round((Number(amount) || 0) * 100) / 100;
  const dollars = Math.floor(num);
  const cents = Math.round((num - dollars) * 100);

  let words = integerToWords(dollars);
  if (cents > 0) {
    words += ` and ${cents}/100`;
  }
  return `${words} Dollars Only`;
}
