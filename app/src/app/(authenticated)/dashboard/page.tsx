"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  generateDays,
  formatDateKey,
  getDayLabel,
  getMonthName,
  navigateWeeks,
  getWeekStart,
} from "@/lib/date-utils";
import { getHolidaySet, isWeekend, isNonWorkingDay } from "@/lib/holidays";
import { useDragSelect } from "@/hooks/useDragSelect";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface Project {
  id: string;
  projectId: string;
  name: string;
  label: string | null;
  isActive: boolean;
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

const MD_PER_MONTH = 18;

function getTotalMdLeft() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), currentMonth + 1, 0).getDate();
  const fractionLeft = (daysInMonth - currentDay) / daysInMonth;
  const remainingFullMonths = 11 - currentMonth;
  return Math.round((fractionLeft + remainingFullMonths) * MD_PER_MONTH);
}

const WORKLOAD_COLORS: Record<string, string> = {
  RED: "bg-red-400 text-white",
  YELLOW: "bg-yellow-300 text-yellow-900",
  GREEN: "bg-green-400 text-white",
};

const WORKLOAD_OPTIONS = [
  { value: "RED" as const, label: "Przeciążony", className: "bg-red-500 hover:bg-red-600 text-white" },
  { value: "YELLOW" as const, label: "Pełne obciążenie", className: "bg-yellow-400 hover:bg-yellow-500 text-yellow-900" },
  { value: "GREEN" as const, label: "Dostępny", className: "bg-green-500 hover:bg-green-600 text-white" },
];

interface Team {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [startDate, setStartDate] = useState(() => getWeekStart(new Date()));

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

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

  // Drag-select state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [primaryProjectId, setPrimaryProjectId] = useState<string>("");
  const [panelWorkload, setPanelWorkload] = useState<"RED" | "YELLOW" | "GREEN">("YELLOW");
  const [projectFilter, setProjectFilter] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const {
    selectedDates,
    isDragging,
    handlePointerDown,
    handlePointerEnter,
    handlePointerUp,
    clearSelection,
    setAllDates,
  } = useDragSelect();

  // Working days in current view (for drag-select ordering)
  const workingDays = useMemo(
    () => days.filter((d) => !isNonWorkingDay(d, holidaySet)),
    [days, holidaySet]
  );

  useEffect(() => {
    setAllDates(workingDays.map(formatDateKey));
  }, [workingDays, setAllDates]);

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: () => fetch("/api/teams").then((r) => r.json()),
  });

  const personsUrl = isSuperAdmin && selectedTeamId !== "all"
    ? `/api/persons?teamId=${selectedTeamId}`
    : "/api/persons";

  const { data: persons = [] } = useQuery<Person[]>({
    queryKey: ["persons", selectedTeamId],
    queryFn: () => fetch(personsUrl).then((r) => r.json()),
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

  // Fetch assignments from today to end of year for MD calculation
  const todayStr = formatDateKey(new Date());
  const yearEnd = `${new Date().getFullYear()}-12-31`;
  const { data: yearAssignments = [] } = useQuery<Assignment[]>({
    queryKey: ["assignments-year", todayStr, yearEnd],
    queryFn: () =>
      fetch(`/api/assignments?dateFrom=${todayStr}&dateTo=${yearEnd}`).then((r) =>
        r.json()
      ),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const activeProjects = projects.filter((p) => p.isActive);

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
  const totalMd = useMemo(() => getTotalMdLeft(), []);

  // Count unique assigned days per person (from today to year end)
  const mdLeftMap = useMemo(() => {
    const plannedDays = new Map<string, Set<string>>();
    for (const a of yearAssignments) {
      const dateStr = a.date.split("T")[0];
      if (!plannedDays.has(a.personId)) {
        plannedDays.set(a.personId, new Set());
      }
      plannedDays.get(a.personId)!.add(dateStr);
    }

    const result = new Map<string, number>();
    for (const person of activePersons) {
      const planned = plannedDays.get(person.id)?.size || 0;
      result.set(person.id, totalMd - planned);
    }
    return result;
  }, [yearAssignments, activePersons, totalMd]);

  // Open assignment panel when drag ends with a selection
  const prevIsDraggingRef = useRef(false);
  useEffect(() => {
    if (prevIsDraggingRef.current && !isDragging && selectedDates.size > 0 && selectedPersonId) {
      const firstDate = Array.from(selectedDates).sort()[0];
      const key = `${selectedPersonId}-${firstDate}`;
      const firstAssignments = assignmentMap.get(key) || [];
      if (firstAssignments.length > 0) {
        setSelectedProjects(new Set(firstAssignments.map((a) => a.projectId)));
        setPrimaryProjectId(firstAssignments.find((a) => a.isPrimary)?.projectId || "");
        setPanelWorkload(firstAssignments[0].workload);
      } else {
        setSelectedProjects(new Set());
        setPrimaryProjectId("");
        setPanelWorkload("YELLOW");
      }
      setPanelOpen(true);
    }
    prevIsDraggingRef.current = isDragging;
  }, [isDragging]); // eslint-disable-line react-hooks/exhaustive-deps

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
      closePanel();
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
      closePanel();
      toast.success("Przypisania zostały usunięte");
    },
  });

  function closePanel() {
    setPanelOpen(false);
    clearSelection();
    setSelectedPersonId(null);
    setProjectFilter("");
  }

  function handleSave() {
    if (!selectedPersonId || selectedDates.size === 0 || selectedProjects.size === 0) return;
    saveMutation.mutate({
      personId: selectedPersonId,
      dates: Array.from(selectedDates),
      projectIds: Array.from(selectedProjects),
      primaryProjectId: primaryProjectId || Array.from(selectedProjects)[0],
      workload: panelWorkload,
    });
  }

  function handleDelete() {
    if (!selectedPersonId || selectedDates.size === 0) return;
    deleteMutation.mutate({
      personId: selectedPersonId,
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

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);

  // Track last entered date to avoid redundant selection updates during pointermove
  const lastEnteredRef = useRef<string | null>(null);

  function handleContainerPointerMove(e: React.PointerEvent) {
    if (!isDragging || !selectedPersonId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest("[data-date]") as HTMLElement | null;
    if (!cell) return;
    const dateKey = cell.dataset.date;
    const personId = cell.dataset.personid;
    if (!dateKey || personId !== selectedPersonId) return;
    if (dateKey === lastEnteredRef.current) return;
    lastEnteredRef.current = dateKey;
    handlePointerEnter(dateKey);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Panel główny</h1>
          {isSuperAdmin && (
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie teamy</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isSuperAdmin && teams.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {teams.map((t) => t.name).join(", ")}
            </span>
          )}
        </div>
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

      <div
        className="overflow-x-auto border rounded-lg bg-white"
        style={{ touchAction: "none" }}
        onPointerUp={() => { lastEnteredRef.current = null; handlePointerUp(); }}
        onPointerMove={handleContainerPointerMove}
      >
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "40px", minWidth: "40px" }} />
            <col style={{ width: "180px", minWidth: "180px" }} />
            {days.map((_, i) => (
              <col key={i} style={{ width: "56px", minWidth: "56px" }} />
            ))}
          </colgroup>

          <thead>
            {/* Month header row */}
            <tr className="border-b">
              <th
                className="sticky left-0 z-20 bg-white border-r px-2 py-1 text-center text-[10px] text-gray-400 font-normal"
                rowSpan={2}
              >
                <span className="cursor-help" title="MD — suma wolnych dni roboczych do końca roku (18 dni/miesiąc minus zaplanowane)">MD</span>
              </th>
              <th
                className="sticky left-[40px] z-20 bg-white border-r px-3 py-1 text-left text-xs text-gray-500 font-medium"
                rowSpan={2}
              >
                Imię i nazwisko
              </th>
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
                    className="sticky left-0 z-10 bg-[#1E293B] border-r border-white/20 px-2 py-1.5 text-[10px] font-bold text-white text-center font-mono"
                    title={`Suma MD wolnych: ${section.name}`}
                  >
                    {people.reduce((sum, p) => sum + (mdLeftMap.get(p.id) ?? totalMd), 0)}
                  </td>
                  <td
                    colSpan={days.length + 1}
                    className="sticky left-[40px] z-10 bg-[#1E293B] px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider"
                  >
                    {section.name}
                  </td>
                </tr>

                {/* Person rows */}
                {people.map((person) => (
                  <tr key={person.id} className="border-b hover:bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r px-2 py-1.5 text-center text-[10px] text-gray-400 font-mono" title="Man Days wolne do końca roku">
                      {mdLeftMap.get(person.id) ?? totalMd}
                    </td>
                    <td className="sticky left-[40px] z-10 bg-white border-r px-3 py-1.5 text-sm font-medium whitespace-nowrap">
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
                      const cellWorkload = primary?.workload || cellAssignments[0]?.workload;
                      const isSelected = selectedDates.has(dateStr) && selectedPersonId === person.id;

                      return (
                        <td
                          key={di}
                          data-date={dateStr}
                          data-personid={person.id}
                          className={cn(
                            "border-r text-center text-[9px] leading-tight p-0 h-8 overflow-hidden select-none",
                            nonWorking ? "bg-gray-200" : "cursor-crosshair",
                            !nonWorking && cellWorkload && WORKLOAD_COLORS[cellWorkload],
                            !nonWorking && isSelected && "ring-2 ring-inset ring-orange-500",
                            isToday(day) && "ring-2 ring-inset ring-[#F97316]",
                          )}
                          onPointerDown={(e) => {
                            if (nonWorking || panelOpen) return;
                            lastEnteredRef.current = dateStr;
                            setSelectedPersonId(person.id);
                            handlePointerDown(dateStr, e);
                          }}
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

      {/* Assignment dialog */}
      <Dialog open={panelOpen} onOpenChange={(open) => { if (!open) closePanel(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Przypisanie projektów</DialogTitle>
          </DialogHeader>

          {selectedPerson && (
            <p className="text-sm text-muted-foreground -mt-2">
              <span className="font-medium text-foreground">
                {selectedPerson.firstName} {selectedPerson.lastName}
              </span>
              {" · "}
              {selectedDates.size} {selectedDates.size === 1 ? "dzień" : "dni"}
            </p>
          )}

          {/* Workload selector */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Obciążenie</Label>
            <div className="flex gap-2">
              {WORKLOAD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPanelWorkload(opt.value)}
                  className={cn(
                    "flex-1 text-xs py-2 px-2 rounded-lg font-medium transition-all",
                    opt.className,
                    panelWorkload === opt.value
                      ? "ring-2 ring-offset-2 ring-gray-900"
                      : "opacity-60"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project list */}
          <div className="flex flex-col min-h-0 flex-1">
            <Label className="text-sm font-medium mb-2 block">Projekty</Label>
            <input
              type="text"
              placeholder="Szukaj projektu..."
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full mb-2 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
            />
            <div className="overflow-y-auto space-y-1.5 max-h-64">
              {activeProjects
                .filter((p) => {
                  if (selectedProjects.has(p.id)) return true;
                  if (!projectFilter) return true;
                  const q = projectFilter.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.projectId.toLowerCase().includes(q) ||
                    (p.label && p.label.toLowerCase().includes(q))
                  );
                })
                .map((project) => (
                  <div key={project.id} className="flex items-center gap-2 py-0.5">
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

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t">
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
            <Button onClick={closePanel} variant="ghost" className="w-full">
              Anuluj
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
