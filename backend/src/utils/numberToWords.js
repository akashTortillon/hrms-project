// Amount-in-words for payslips, e.g. 10840 -> "Ten Thousand Eight Hundred and Forty AED Only".
// British style ("... Hundred and Forty"), supports fils ("... AED and 50 Fils Only")
// up to billions. No external dependency.
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = [
  { value: 1e9, name: "Billion" },
  { value: 1e6, name: "Million" },
  { value: 1e3, name: "Thousand" }
];

const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);

const belowThousand = (n) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(`${hundreds ? "and " : ""}${belowHundred(rest)}`);
  return parts.join(" ");
};

export const integerToWords = (value) => {
  let n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return "Zero";
  const parts = [];
  for (const { value: scale, name } of SCALES) {
    if (n >= scale) {
      parts.push(`${belowThousand(Math.floor(n / scale))} ${name}`);
      n %= scale;
    }
  }
  if (n > 0) {
    // "One Thousand and Five" / "Two Million and Fifty" - British "and" before a final
    // sub-hundred group; groups with their own hundreds already carry an inner "and".
    parts.push(parts.length && n < 100 ? `and ${belowThousand(n)}` : belowThousand(n));
  }
  return parts.join(" ");
};

export const amountToWordsAED = (amount) => {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100;
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const dirhams = Math.floor(abs);
  const fils = Math.round((abs - dirhams) * 100);
  let text = `${integerToWords(dirhams)} AED`;
  if (fils) text += ` and ${integerToWords(fils)} Fils`;
  return `${negative ? "Minus " : ""}${text} Only`;
};
