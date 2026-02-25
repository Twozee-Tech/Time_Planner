"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
}

interface Project {
  id: string;
  projectId: string;
  name: string;
  label: string | null;
  color: string | null;
  isActive: boolean;
  teamProjects: { team: Team }[];
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ projectId: "", name: "", label: "" });
  const [filterTeamId, setFilterTeamId] = useState<string>("all");

  const isSuperAdmin =
    (session?.user as { role?: string } | undefined)?.role === "SUPER_ADMIN";

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: () => fetch("/api/teams").then((r) => r.json()),
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error("Błąd tworzenia");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeDialog();
      toast.success("Projekt został dodany");
    },
    onError: () => toast.error("Nie udało się dodać projektu"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error("Błąd aktualizacji");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeDialog();
      toast.success("Projekt został zaktualizowany");
    },
    onError: () => toast.error("Nie udało się zaktualizować projektu"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/projects/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Błąd");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt został dezaktywowany");
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ projectId: "", name: "", label: "" });
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      projectId: project.projectId,
      name: project.name,
      label: project.label || "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const filtered = projects.filter((p) => {
    if (filterTeamId === "all") return true;
    return p.teamProjects.some((tp) => tp.team.id === filterTeamId);
  });

  const activeProjects = filtered.filter((p) => p.isActive);
  const inactiveProjects = filtered.filter((p) => !p.isActive);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projekty</h1>
          <p className="text-muted-foreground mt-1">Zarządzanie projektami</p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && teams.length > 0 && (
            <Select value={filterTeamId} onValueChange={setFilterTeamId}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie teamy</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={openCreate} className="bg-[#F97316] hover:bg-[#EA580C]">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj projekt
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">ID Projektu</TableHead>
                <TableHead className="max-w-xs">Nazwa</TableHead>
                <TableHead className="w-44">Label</TableHead>
                {isSuperAdmin && <TableHead className="w-36">Zespół</TableHead>}
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-sm">{project.projectId}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate" title={project.name}>{project.name}</TableCell>
                  <TableCell>{project.label || "—"}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {project.teamProjects.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          project.teamProjects.map((tp) => (
                            <Badge
                              key={tp.team.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tp.team.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                      Aktywny
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(project)}
                        title="Edytuj"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deactivateMutation.mutate(project.id)}
                        title="Dezaktywuj"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {inactiveProjects.map((project) => (
                <TableRow key={project.id} className="opacity-50">
                  <TableCell className="font-mono text-sm">{project.projectId}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate" title={project.name}>{project.name}</TableCell>
                  <TableCell>{project.label || "—"}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {project.teamProjects.map((tp) => (
                          <Badge key={tp.team.id} variant="secondary" className="text-xs">
                            {tp.team.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="secondary">Nieaktywny</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(project)}
                      title="Edytuj"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Brak projektów.
            </p>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj projekt" : "Dodaj projekt"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">ID Projektu</Label>
              <Input
                id="projectId"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                placeholder="np. PROJ-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nazwa projektu"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label (skrót)</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Krótki label do kalendarza"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Anuluj
              </Button>
              <Button type="submit" className="bg-[#F97316] hover:bg-[#EA580C]">
                {editing ? "Zapisz" : "Dodaj"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
