import { startOfWeek, addDays, format, addWeeks, subWeeks } from "date-fns";
import { pl } from "date-fns/locale";

const DAY_LABELS = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export function getWeekStart(date: Date): Date {
  // Monday as start of week
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function generateDays(startDate: Date, numWeeks: number): Date[] {
  const days: Date[] = [];
  const weekStart = getWeekStart(startDate);
  for (let i = 0; i < numWeeks * 7; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
}

export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getDayLabel(date: Date): string {
  return DAY_LABELS[date.getDay()];
}

export function getMonthName(month: number): string {
  return MONTH_NAMES[month];
}

export function navigateWeeks(current: Date, direction: "prev" | "next", weeks: number = 2): Date {
  return direction === "next" ? addWeeks(current, weeks) : subWeeks(current, weeks);
}

export { pl, format, addDays, addWeeks, subWeeks };
