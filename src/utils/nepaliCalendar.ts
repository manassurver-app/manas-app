// Nepali Bikram Sambat (B.S.) Calendar helper functions

export const NEPALI_MONTHS = [
  { index: 1, en: 'Baisakh', ne: 'वैशाख', days: 31 },
  { index: 2, en: 'Jestha', ne: 'जेठ', days: 31 },
  { index: 3, en: 'Ashadh', ne: 'असार', days: 32 },
  { index: 4, en: 'Shrawan', ne: 'श्रावण', days: 31 },
  { index: 5, en: 'Bhadra', ne: 'भाद्र', days: 31 },
  { index: 6, en: 'Ashwin', ne: 'असोज', days: 30 },
  { index: 7, en: 'Kartik', ne: 'कार्तिक', days: 30 },
  { index: 8, en: 'Mangsir', ne: 'मंसिर', days: 30 },
  { index: 9, en: 'Poush', ne: 'पुष', days: 29 },
  { index: 10, en: 'Magh', ne: 'माघ', days: 30 },
  { index: 11, en: 'Falgun', ne: 'फाल्गुन', days: 30 },
  { index: 12, en: 'Chaitra', ne: 'चैत्र', days: 30 },
];

export const NEPALI_DIGITS: Record<string, string> = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
};

export const toNepaliNumerals = (num: number | string): string => {
  return String(num).replace(/[0-9]/g, (match) => NEPALI_DIGITS[match] || match);
};

export const formatCurrencyNPR = (amount: number, inNepaliDigits: boolean = false): string => {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  if (inNepaliDigits) {
    return `रू ${toNepaliNumerals(formatted)}`;
  }
  return `Rs. ${formatted}`;
};

/**
 * Calculates current approximate Nepali BS Date based on Gregorian date.
 * Year 2026 AD corresponds to approx 2083 BS.
 */
export function getCurrentNepaliDate(): {
  year: number;
  month: number;
  day: number;
  formattedBS: string;
  monthNameEn: string;
  monthNameNe: string;
  monthYearString: string;
} {
  const now = new Date();
  // Standard conversion baseline: 2026-08-19 is around Shrawan 2083 or Bhadra 2083
  // Let's create an intuitive and realistic converter for 2080-2085 BS
  const adYear = now.getFullYear();
  const adMonth = now.getMonth(); // 0-indexed (7 = Aug)
  const adDate = now.getDate();

  // Baseline mapping for modern BS years:
  let bsYear = adYear + 57;
  let bsMonth = 4; // Default Shrawan
  let bsDay = 15;

  // Approximate seasonal map
  if (adMonth === 0) { bsMonth = 9; bsDay = (adDate + 16) % 30 || 1; } // Jan -> Poush/Magh
  else if (adMonth === 1) { bsMonth = 10; bsDay = (adDate + 17) % 30 || 1; } // Feb -> Magh/Falgun
  else if (adMonth === 2) { bsMonth = 11; bsDay = (adDate + 16) % 30 || 1; } // Mar -> Falgun/Chaitra
  else if (adMonth === 3) { // Apr -> Chaitra/Baisakh (New Year)
    if (adDate < 14) { bsMonth = 12; bsYear -= 1; }
    else { bsMonth = 1; bsDay = adDate - 13; }
  }
  else if (adMonth === 4) { bsMonth = 2; bsDay = (adDate + 17) % 31 || 1; } // May -> Jestha
  else if (adMonth === 5) { bsMonth = 3; bsDay = (adDate + 16) % 32 || 1; } // Jun -> Ashadh
  else if (adMonth === 6) { bsMonth = 4; bsDay = (adDate + 16) % 31 || 1; } // Jul -> Shrawan
  else if (adMonth === 7) { // Aug -> Shrawan/Bhadra
    if (adDate <= 16) { bsMonth = 4; bsDay = adDate + 15; }
    else { bsMonth = 5; bsDay = adDate - 16; }
  }
  else if (adMonth === 8) { bsMonth = 6; bsDay = (adDate + 16) % 30 || 1; } // Sep -> Ashwin
  else if (adMonth === 9) { bsMonth = 7; bsDay = (adDate + 16) % 30 || 1; } // Oct -> Kartik
  else if (adMonth === 10) { bsMonth = 8; bsDay = (adDate + 15) % 30 || 1; } // Nov -> Mangsir
  else if (adMonth === 11) { bsMonth = 9; bsDay = (adDate + 15) % 29 || 1; } // Dec -> Poush

  const monthObj = NEPALI_MONTHS[bsMonth - 1] || NEPALI_MONTHS[3];
  const mm = String(bsMonth).padStart(2, '0');
  const dd = String(bsDay).padStart(2, '0');
  const formattedBS = `${bsYear}-${mm}-${dd}`;
  const monthYearString = `${monthObj.en} ${bsYear}`;

  return {
    year: bsYear,
    month: bsMonth,
    day: bsDay,
    formattedBS,
    monthNameEn: monthObj.en,
    monthNameNe: monthObj.ne,
    monthYearString,
  };
}

export function getDaysInNepaliMonth(monthIndex: number): number {
  return NEPALI_MONTHS[monthIndex - 1]?.days || 30;
}

export function formatBSToNepaliDate(bsString: string): string {
  // e.g. "2083-04-15" -> "२०८३ श्रावण १५"
  try {
    const [y, m, d] = bsString.split('-');
    const mNum = parseInt(m, 10);
    const monthNe = NEPALI_MONTHS[mNum - 1]?.ne || '';
    return `${toNepaliNumerals(y)} ${monthNe} ${toNepaliNumerals(parseInt(d, 10))}`;
  } catch {
    return bsString;
  }
}
