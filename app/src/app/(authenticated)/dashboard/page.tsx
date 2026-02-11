"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  generateDays,
  formatDateKey,
  getDayLabel,
  getMonthName,
  navigateWeeks,
  getWeekStart,
} from "@/lib/date-utils";
import { getHolidaySet, isWeekend, isNonWorkingDay } from "@/lib/holidays";
import { cn } from "@/lib/utils";

const NUM_WEEKS = 8;

interface Assignment {
  id: string;
  personId: string;
  projectId: string;
  date: string;
  isPrimary: boolean;
  workload: "RED" | "YELLOW" | "GREEN";
  project: {
    id: string;
    projectId: string;
    name: string;
    label: string | null;
    color: string | null;
  };
}

interface Section {
  id: string;
  name: string;
  sortOrder: number;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  sectionId: string;
  isActive: boolean;
  sortOrder: number;
  section: Section;
}

const WORKLOAD_COLORS: Record<string, string> = {
  RED: "bg-red-400 text-white",
  YELLOW: "bg-yellow-300 text-yellow-900",
  GREEN: "bg-green-400 text-white",
};

export default function DashboardPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState(() => getWeekStart(new Date()));

  const days = useMemo(() => generateDays(startDate, NUM_WEEKS), [startDate]);
  const dateFrom = formatDateKey(days[0]);
  const dateTo = formatDateKey(days[days.length - 1]);

  // Compute holiday set for all years in range
  const holidaySet = useMemo(() => {
    const years = new Set(days.map((d) => d.getFullYear()));
    const set = new Set<string>();
    for (const year of years) {
      for (const h of getHolidaySet(year)) {
        set.add(h);
      }
    }
    return set;
  }, [days]);

  const { data: persons = [] } = useQuery<Person[]>({
    queryKey: ["persons"],
    queryFn: () => fetch("/api/persons").then((r) => r.json()),
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["sections"],
    queryFn: () => fetch("/api/sections").then((r) => r.json()),
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["assignments", dateFrom, dateTo],
    queryFn: () =>
      fetch(`/api/assignments?dateFrom=${dateFrom}&dateTo=${dateTo}`).then((r) =>
        r.json()
      ),
  });

  // Build lookup map: "personId-date" -> Assignment[]
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const dateStr = a.date.split("T")[0];
      const key = `${a.personId}-${dateStr}`;
      const existing = map.get(key) || [];
      existing.push(a);
      map.set(key, existing);
    }
    return map;
  }, [assignments]);

  // Group persons by section
  const activePersons = persons.filter((p) => p.isActive);
  const grouped = sections
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => ({
      section,
      people: activePersons
        .filter((p) => p.sectionId === section.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((g) => g.people.length > 0);

  // Compute month spans for header
  const monthSpans = useMemo(() => {
    const spans: { month: number; year: number; count: number }[] = [];
    for (const day of days) {
      const m = day.getMonth();
      const y = day.getFullYear();
      const last = spans[spans.length - 1];
      if (last && last.month === m && last.year === y) {
        last.count++;
      } else {
        spans.push({ month: m, year: y, count: 1 });
      }
    }
    return spans;
  }, [days]);

  const isToday = (date: Date) => formatDateKey(date) === formatDateKey(new Date());

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Panel główny</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate(getWeekStart(new Date()))}
          >
            Dziś
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setStartDate(navigateWeeks(startDate, "prev"))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setStartDate(navigateWeeks(startDate, "next"))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "180px", minWidth: "180px" }} />
            {days.map((_, i) => (
              <col key={i} style={{ width: "56px", minWidth: "56px" }} />
            ))}
          </colgroup>

          <thead>
            {/* Month header row */}
            <tr className="border-b">
              <th
                className="sticky left-0 z-20 bg-white border-r px-3 py-1"
                rowSpan={2}
              />
              {monthSpans.map((span, i) => (
                <th
                  key={i}
                  colSpan={span.count}
                  className="text-center text-xs font-semibold text-gray-600 border-r px-1 py-1 bg-gray-50"
                >
                  {getMonthName(span.month)} {span.year}
                </th>
              ))}
            </tr>

            {/* Day header row */}
            <tr className="border-b">
              {days.map((day, i) => {
                const nonWorking = isNonWorkingDay(day, holidaySet);
                const today = isToday(day);
                return (
                  <th
                    key={i}
                    className={cn(
                      "text-center text-[10px] leading-tight border-r px-0.5 py-1",
                      nonWorking ? "bg-gray-200 text-gray-400" : "bg-gray-50 text-gray-600",
                      today && "ring-2 ring-inset ring-[#F97316]"
                    )}
                  >
                    <div>{getDayLabel(day)}</div>
                    <div className="font-bold text-xs">{day.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {grouped.map(({ section, people }) => (
              <>
                {/* Section header row */}
                <tr key={`section-${section.id}`} className="bg-[#1E293B]">
                  <td
                    colSpan={days.length + 1}
                    className="sticky left-0 z-10 px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider"
                  >
                    {section.name}
                  </td>
                </tr>

                {/* Person rows */}
                {people.map((person) => (
                  <tr key={person.id} className="border-b hover:bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r px-3 py-1.5 text-sm font-medium whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/person/${person.id}`)}
                        className="text-left hover:text-[#F97316] hover:underline transition-colors"
                      >
                        {person.firstName} {person.lastName}
                      </button>
                    </td>
                    {days.map((day, di) => {
                      const dateStr = formatDateKey(day);
                      const nonWorking = isNonWorkingDay(day, holidaySet);
                      const key = `${person.id}-${dateStr}`;
                      const cellAssignments = assignmentMap.get(key) || [];
                      const primary = cellAssignments.find((a) => a.isPrimary);
                      const workload = primary?.workload || cellAssignments[0]?.workload;

                      return (
                        <td
                          key={di}
                          className={cn(
                            "border-r text-center text-[9px] leading-tight p-0 h-8 overflow-hidden",
                            nonWorking && "bg-gray-200",
                            !nonWorking && workload && WORKLOAD_COLORS[workload],
                            isToday(day) && "ring-2 ring-inset ring-[#F97316]"
                          )}
                          title={
                            cellAssignments.length > 0
                              ? cellAssignments.map((a) => a.project.name).join(", ")
                              : undefined
                          }
                        >
                          {!nonWorking && primary && (
                            <span className="truncate block px-0.5">
                              {primary.project.label || primary.project.name}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
