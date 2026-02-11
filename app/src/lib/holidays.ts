// Polish public holidays computation
// Fixed holidays + Easter-dependent moveable holidays

function getEasterDate(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getPolishHolidays(year: number): Date[] {
  const easter = getEasterDate(year);
  const easterMs = easter.getTime();
  const day = 24 * 60 * 60 * 1000;

  return [
    new Date(year, 0, 1),   // Nowy Rok
    new Date(year, 0, 6),   // Trzech Króli
    easter,                   // Wielkanoc
    new Date(easterMs + 1 * day), // Poniedziałek Wielkanocny
    new Date(year, 4, 1),   // Święto Pracy
    new Date(year, 4, 3),   // Święto Konstytucji
    new Date(easterMs + 49 * day), // Zielone Świątki
    new Date(easterMs + 60 * day), // Boże Ciało
    new Date(year, 7, 15),  // Wniebowzięcie NMP
    new Date(year, 10, 1),  // Wszystkich Świętych
    new Date(year, 10, 11), // Święto Niepodległości
    new Date(year, 11, 25), // Boże Narodzenie
    new Date(year, 11, 26), // Drugi dzień Bożego Narodzenia
  ];
}

export function getHolidaySet(year: number): Set<string> {
  const holidays = getPolishHolidays(year);
  return new Set(holidays.map((d) => d.toISOString().split("T")[0]));
}

export function isHoliday(date: Date, holidaySet: Set<string>): boolean {
  return holidaySet.has(date.toISOString().split("T")[0]);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isNonWorkingDay(date: Date, holidaySet: Set<string>): boolean {
  return isWeekend(date) || isHoliday(date, holidaySet);
}
