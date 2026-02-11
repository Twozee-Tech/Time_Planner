"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  projectId: string;
  name: string;
  label: string | null;
  color: string | null;
  isActive: boolean;
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ projectId: "", name: "", label: "" });

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
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

  const activeProjects = projects.filter((p) => p.isActive);
  const inactiveProjects = projects.filter((p) => !p.isActive);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projekty</h1>
          <p className="text-muted-foreground mt-1">Zarządzanie projektami</p>
        </div>
        <Button onClick={openCreate} className="bg-[#F97316] hover:bg-[#EA580C]">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj projekt
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Projektu</TableHead>
                <TableHead>Nazwa</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-sm">{project.projectId}</TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.label || "—"}</TableCell>
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
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.label || "—"}</TableCell>
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

          {projects.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Brak projektów. Dodaj pierwszy projekt.
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
