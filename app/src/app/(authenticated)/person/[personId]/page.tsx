"use client";

import { useState, useMemo, useEffect, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, ArrowLeft, Trash2 } from "lucide-react";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";
import { formatDateKey, getDayLabel, getMonthName } from "@/lib/date-utils";
import { getHolidaySet, isNonWorkingDay } from "@/lib/holidays";
import { useDragSelect } from "@/hooks/useDragSelect";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  };
}

interface Project {
  id: string;
  projectId: string;
  name: string;
  label: string | null;
  isActive: boolean;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  section: { name: string };
}

const WORKLOAD_OPTIONS = [
  { value: "RED" as const, label: "Przeciążony", className: "bg-red-500 hover:bg-red-600 text-white" },
  { value: "YELLOW" as const, label: "Pełne obciążenie", className: "bg-yellow-400 hover:bg-yellow-500 text-yellow-900" },
  { value: "GREEN" as const, label: "Dostępny", className: "bg-green-500 hover:bg-green-600 text-white" },
];

const WORKLOAD_BG: Record<string, string> = {
  RED: "bg-red-200",
  YELLOW: "bg-yellow-200",
  GREEN: "bg-green-200",
};

const DAY_HEADERS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function buildMonthGrid(month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let current = calStart;
  while (current <= calEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return { days, weeks, monthStart, monthEnd };
}

export default function PersonCalendarPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [primaryProjectId, setPrimaryProjectId] = useState<string>("");
  const [workload, setWorkload] = useState<"RED" | "YELLOW" | "GREEN">("YELLOW");
  const [projectFilter, setProjectFilter] = useState("");

  const {
    selectedDates,
    isDragging,
    handlePointerDown,
    handlePointerEnter,
    handlePointerUp,
    clearSelection,
    setAllDates,
  } = useDragSelect();

  const nextMonth = addMonths(currentMonth, 1);

  // Build grids for both months
  const month1 = useMemo(() => buildMonthGrid(currentMonth), [currentMonth.getTime()]);
  const month2 = useMemo(() => buildMonthGrid(nextMonth), [nextMonth.getTime()]);

  // Holiday set covering both months
  const holidaySet = useMemo(() => {
    const allDays = [...month1.days, ...month2.days];
    const years = new Set(allDays.map((d) => d.getFullYear()));
    const set = new Set<string>();
    for (const year of years) {
      for (const h of getHolidaySet(year)) set.add(h);
    }
    return set;
  }, [month1.days, month2.days]);

  // Working days from both months (for drag selection)
  const workingDays = useMemo(() => {
    const m1working = month1.days.filter(
      (d) => !isNonWorkingDay(d, holidaySet) && d.getMonth() === currentMonth.getMonth()
    );
    const m2working = month2.days.filter(
      (d) => !isNonWorkingDay(d, holidaySet) && d.getMonth() === nextMonth.getMonth()
    );
    return [...m1working, ...m2working];
  }, [month1.days, month2.days, holidaySet, currentMonth, nextMonth]);

  useEffect(() => {
    setAllDates(workingDays.map(formatDateKey));
  }, [workingDays, setAllDates]);

  // Fetch data spanning both months
  const dateFrom = formatDateKey(month1.days[0]);
  const dateTo = formatDateKey(month2.days[month2.days.length - 1]);

  const { data: person } = useQuery<Person>({
    queryKey: ["person", personId],
    queryFn: () => fetch(`/api/persons/${personId}`).then((r) => r.json()),
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["assignments", personId, dateFrom, dateTo],
    queryFn: () =>
      fetch(`/api/assignments?dateFrom=${dateFrom}&dateTo=${dateTo}&personId=${personId}`).then((r) =>
        r.json()
      ),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const activeProjects = projects.filter((p) => p.isActive);

  // Assignment map for display
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const dateStr = a.date.split("T")[0];
      const existing = map.get(dateStr) || [];
      existing.push(a);
      map.set(dateStr, existing);
    }
    return map;
  }, [assignments]);

  // When selection changes, pre-populate panel from existing assignments
  useEffect(() => {
    if (selectedDates.size === 0) return;

    const selectedArray = Array.from(selectedDates);
    const firstDateAssignments = assignmentMap.get(selectedArray[0]) || [];

    if (firstDateAssignments.length > 0) {
      const projectSet = new Set(firstDateAssignments.map((a) => a.projectId));
      const primary = firstDateAssignments.find((a) => a.isPrimary);
      setSelectedProjects(projectSet);
      setPrimaryProjectId(primary?.projectId || "");
      setWorkload(firstDateAssignments[0].workload);
    } else {
      setSelectedProjects(new Set());
      setPrimaryProjectId("");
      setWorkload("YELLOW");
    }
  }, [selectedDates, assignmentMap]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: {
      personId: string;
      dates: string[];
      projectIds: string[];
      primaryProjectId: string;
      workload: string;
    }) =>
      fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error("Błąd zapisu");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      clearSelection();
      toast.success("Przypisania zostały zapisane");
    },
    onError: () => toast.error("Nie udało się zapisać przypisań"),
  });

  const deleteMutation = useMutation({
    mutationFn: (data: { personId: string; dates: string[] }) =>
      fetch("/api/assignments/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error("Błąd");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      clearSelection();
      toast.success("Przypisania zostały usunięte");
    },
  });

  function handleSave() {
    if (selectedDates.size === 0 || selectedProjects.size === 0) return;
    saveMutation.mutate({
      personId,
      dates: Array.from(selectedDates),
      projectIds: Array.from(selectedProjects),
      primaryProjectId: primaryProjectId || Array.from(selectedProjects)[0],
      workload,
    });
  }

  function handleDelete() {
    if (selectedDates.size === 0) return;
    deleteMutation.mutate({
      personId,
      dates: Array.from(selectedDates),
    });
  }

  function toggleProject(projectId: string) {
    const next = new Set(selectedProjects);
    if (next.has(projectId)) {
      next.delete(projectId);
      if (primaryProjectId === projectId) {
        setPrimaryProjectId(Array.from(next)[0] || "");
      }
    } else {
      next.add(projectId);
      if (next.size === 1) setPrimaryProjectId(projectId);
    }
    setSelectedProjects(next);
  }

  function renderMonthGrid(month: Date, weeks: Date[][]) {
    const monthIdx = month.getMonth();
    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
            {week.map((day) => {
              const dateStr = formatDateKey(day);
              const isThisMonth = day.getMonth() === monthIdx;
              const nonWorking = isNonWorkingDay(day, holidaySet);
              const isSelected = selectedDates.has(dateStr);
              const dayAssignments = assignmentMap.get(dateStr) || [];
              const primary = dayAssignments.find((a) => a.isPrimary);
              const wl = primary?.workload || dayAssignments[0]?.workload;
              const isSelectableDay = isThisMonth && !nonWorking;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "relative h-20 rounded-lg border text-sm p-1 transition-colors",
                    !isThisMonth && "opacity-30",
                    nonWorking && isThisMonth && "bg-gray-100 text-gray-400",
                    isSelectableDay && !wl && "bg-white hover:bg-gray-50 cursor-pointer",
                    isSelectableDay && wl && WORKLOAD_BG[wl],
                    isSelected && "ring-2 ring-[#F97316] ring-offset-1",
                    isDragging && isSelectableDay && "cursor-crosshair"
                  )}
                  onPointerDown={(e) => isSelectableDay && handlePointerDown(dateStr, e)}
                  onPointerEnter={() => isSelectableDay && handlePointerEnter(dateStr)}
                >
                  <div className={cn(
                    "text-xs font-medium",
                    formatDateKey(new Date()) === dateStr && "text-[#F97316] font-bold"
                  )}>
                    {day.getDate()}
                  </div>
                  {isThisMonth && dayAssignments.length > 0 && (
                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {dayAssignments.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          className={cn(
                            "text-[9px] leading-tight truncate rounded px-0.5",
                            a.isPrimary ? "font-bold" : "text-gray-600"
                          )}
                        >
                          {a.project.label || a.project.name}
                        </div>
                      ))}
                      {dayAssignments.length > 3 && (
                        <div className="text-[9px] text-gray-400">+{dayAssignments.length - 3}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Calendar area */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {person ? `${person.firstName} ${person.lastName}` : "Ładowanie..."}
            </h1>
            {person && (
              <p className="text-sm text-muted-foreground">{person.section.name}</p>
            )}
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4 max-w-2xl">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {getMonthName(currentMonth.getMonth())} {currentMonth.getFullYear()}
            {" — "}
            {getMonthName(nextMonth.getMonth())} {nextMonth.getFullYear()}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Two calendar grids */}
        <div
          className="max-w-2xl select-none space-y-6"
          style={{ touchAction: "none" }}
          onPointerUp={handlePointerUp}
        >
          {/* Month 1 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              {getMonthName(currentMonth.getMonth())} {currentMonth.getFullYear()}
            </h3>
            {renderMonthGrid(currentMonth, month1.weeks)}
          </div>

          {/* Month 2 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              {getMonthName(nextMonth.getMonth())} {nextMonth.getFullYear()}
            </h3>
            {renderMonthGrid(nextMonth, month2.weeks)}
          </div>
        </div>
      </div>

      {/* Assignment panel (right side) */}
      {selectedDates.size > 0 && (
        <div className="w-96 shrink-0 border-l bg-white p-5 overflow-y-auto">
          <h3 className="font-semibold text-lg mb-1">Przypisanie projektów</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Zaznaczono {selectedDates.size} {selectedDates.size === 1 ? "dzień" : "dni"}
          </p>

          {/* Workload selector */}
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Obciążenie</Label>
            <div className="flex gap-2">
              {WORKLOAD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setWorkload(opt.value)}
                  className={cn(
                    "flex-1 text-xs py-2 px-2 rounded-lg font-medium transition-all",
                    opt.className,
                    workload === opt.value
                      ? "ring-2 ring-offset-2 ring-gray-900"
                      : "opacity-60"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project checkboxes */}
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Projekty</Label>
            <input
              type="text"
              placeholder="Szukaj projektu..."
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full mb-2 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
            />
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {activeProjects.filter((p) => {
                if (selectedProjects.has(p.id)) return true;
                if (!projectFilter) return true;
                const q = projectFilter.toLowerCase();
                return (
                  p.name.toLowerCase().includes(q) ||
                  p.projectId.toLowerCase().includes(q) ||
                  (p.label && p.label.toLowerCase().includes(q))
                );
              }).map((project) => (
                <div key={project.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={`proj-${project.id}`}
                    checked={selectedProjects.has(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                    className="shrink-0"
                  />
                  <label
                    htmlFor={`proj-${project.id}`}
                    className="flex-1 text-sm cursor-pointer truncate"
                    title={project.name}
                  >
                    {project.label || project.name}
                  </label>
                  {selectedProjects.has(project.id) && (
                    <button
                      onClick={() => setPrimaryProjectId(project.id)}
                      className={cn(
                        "shrink-0 text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap",
                        primaryProjectId === project.id
                          ? "bg-[#F97316] text-white border-[#F97316]"
                          : "text-gray-500 border-gray-300 hover:border-[#F97316]"
                      )}
                    >
                      {primaryProjectId === project.id ? "Główny" : "Ustaw główny"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleSave}
              disabled={selectedProjects.size === 0 || saveMutation.isPending}
              className="w-full bg-[#F97316] hover:bg-[#EA580C]"
            >
              {saveMutation.isPending ? "Zapisywanie..." : "Zapisz"}
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń przypisania
            </Button>
            <Button
              onClick={clearSelection}
              variant="ghost"
              className="w-full"
            >
              Anuluj
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
