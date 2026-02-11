"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, UserMinus } from "lucide-react";
import { toast } from "sonner";

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
  sdmId: string | null;
  isActive: boolean;
  sortOrder: number;
  section: Section;
  sdm: { id: string; firstName: string; lastName: string } | null;
}

export default function PeoplePage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    sectionId: "",
    sdmId: null as string | null,
  });

  const { data: persons = [], isLoading } = useQuery<Person[]>({
    queryKey: ["persons"],
    queryFn: () => fetch("/api/persons").then((r) => r.json()),
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["sections"],
    queryFn: () => fetch("/api/sections").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error("Błąd");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      closeDialog();
      toast.success("Osoba została dodana");
    },
    onError: () => toast.error("Nie udało się dodać osoby"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      fetch(`/api/persons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error("Błąd");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      closeDialog();
      toast.success("Osoba została zaktualizowana");
    },
    onError: () => toast.error("Nie udało się zaktualizować osoby"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/persons/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Błąd");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success("Osoba została dezaktywowana");
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ firstName: "", lastName: "", sectionId: sections[0]?.id || "", sdmId: null });
    setDialogOpen(true);
  }

  function openEdit(person: Person) {
    setEditing(person);
    setForm({
      firstName: person.firstName,
      lastName: person.lastName,
      sectionId: person.sectionId,
      sdmId: person.sdmId,
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

  // Group by section
  const grouped = sections.map((section) => ({
    section,
    people: persons.filter((p) => p.sectionId === section.id),
  }));

  const activePeople = persons.filter((p) => p.isActive);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Osoby</h1>
          <p className="text-muted-foreground mt-1">Zarządzanie osobami w zespole</p>
        </div>
        <Button onClick={openCreate} className="bg-[#F97316] hover:bg-[#EA580C]">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj osobę
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Sekcja</TableHead>
              <TableHead>SDM</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map(({ section, people }) =>
              people.map((person, idx) => (
                <TableRow
                  key={person.id}
                  className={!person.isActive ? "opacity-50" : ""}
                >
                  <TableCell>
                    {idx === 0 && (
                      <div className="text-xs font-semibold text-[#F97316] uppercase tracking-wide mb-1">
                        {section.name}
                      </div>
                    )}
                    <span className="font-medium">
                      {person.firstName} {person.lastName}
                    </span>
                  </TableCell>
                  <TableCell>{person.section.name}</TableCell>
                  <TableCell>
                    {person.sdm
                      ? `${person.sdm.firstName} ${person.sdm.lastName}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={person.isActive ? "default" : "secondary"}
                      className={
                        person.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : ""
                      }
                    >
                      {person.isActive ? "Aktywna" : "Nieaktywna"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(person)}
                        title="Edytuj"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {person.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deactivateMutation.mutate(person.id)}
                          title="Dezaktywuj"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj osobę" : "Dodaj osobę"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sekcja</Label>
              <Select
                value={form.sectionId}
                onValueChange={(v) => setForm({ ...form, sectionId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz sekcję" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SDM (Scrum Development Manager)</Label>
              <Select
                value={form.sdmId || "none"}
                onValueChange={(v) => setForm({ ...form, sdmId: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz SDM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  {activePeople
                    .filter((p) => p.id !== editing?.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
