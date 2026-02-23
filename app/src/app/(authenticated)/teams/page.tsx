"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  _count: { members: number; projects: number; users: number };
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  section: { name: string };
  isActive: boolean;
}

interface Project {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

type ManageTab = "members" | "projects" | "users";

export default function TeamsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });

  const [manageTeam, setManageTeam] = useState<Team | null>(null);
  const [manageTab, setManageTab] = useState<ManageTab>("members");

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  // Redirect non-super-admins
  if (session && !isSuperAdmin) {
    router.push("/dashboard");
    return null;
  }

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: () => fetch("/api/teams").then((r) => r.json()),
    enabled: isSuperAdmin,
  });

  const { data: allPersons = [] } = useQuery<Person[]>({
    queryKey: ["all-persons"],
    queryFn: () => fetch("/api/persons").then((r) => r.json()),
    enabled: !!manageTeam,
  });

  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ["all-projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
    enabled: !!manageTeam,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["all-users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    enabled: !!manageTeam,
  });

  const { data: teamMembers = [] } = useQuery<Person[]>({
    queryKey: ["team-members", manageTeam?.id],
    queryFn: () => fetch(`/api/teams/${manageTeam!.id}/members`).then((r) => r.json()),
    enabled: !!manageTeam,
  });

  const { data: teamProjects = [] } = useQuery<Project[]>({
    queryKey: ["team-projects", manageTeam?.id],
    queryFn: () => fetch(`/api/teams/${manageTeam!.id}/projects`).then((r) => r.json()),
    enabled: !!manageTeam,
  });

  const { data: teamUsers = [] } = useQuery<User[]>({
    queryKey: ["team-users", manageTeam?.id],
    queryFn: () => fetch(`/api/teams/${manageTeam!.id}/users`).then((r) => r.json()),
    enabled: !!manageTeam,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Błąd"); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setCreateOpen(false);
      setCreateForm({ name: "", description: "" });
      toast.success("Team został utworzony");
    },
    onError: (e) => toast.error(e.message || "Nie udało się utworzyć teamu"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/teams/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Błąd"); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team został usunięty");
    },
    onError: (e) => toast.error(e.message || "Nie udało się usunąć teamu"),
  });

  async function toggleMember(personId: string, isInTeam: boolean) {
    if (!manageTeam) return;
    const method = isInTeam ? "DELETE" : "POST";
    const res = await fetch(`/api/teams/${manageTeam.id}/members`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });
    if (!res.ok) {
      toast.error("Błąd przy zmianie członka teamu");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["team-members", manageTeam.id] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  async function toggleProject(projectId: string, isInTeam: boolean) {
    if (!manageTeam) return;
    const method = isInTeam ? "DELETE" : "POST";
    const res = await fetch(`/api/teams/${manageTeam.id}/projects`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) {
      toast.error("Błąd przy zmianie projektu teamu");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["team-projects", manageTeam.id] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  async function toggleUser(userId: string, isInTeam: boolean) {
    if (!manageTeam) return;
    const method = isInTeam ? "DELETE" : "POST";
    const res = await fetch(`/api/teams/${manageTeam.id}/users`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      toast.error("Błąd przy zmianie użytkownika teamu");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["team-users", manageTeam.id] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  const memberIds = new Set(teamMembers.map((p) => p.id));
  const projectIds = new Set(teamProjects.map((p) => p.id));
  const userIds = new Set(teamUsers.map((u) => u.id));

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teamy</h1>
          <p className="text-muted-foreground mt-1">Zarządzanie teamami i dostępem</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-[#F97316] hover:bg-[#EA580C]">
          <Plus className="h-4 w-4 mr-2" />
          Nowy team
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Opis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Osoby</TableHead>
                <TableHead>Projekty</TableHead>
                <TableHead>Użytkownicy</TableHead>
                <TableHead className="w-28">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="text-muted-foreground">{team.description || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={team.isActive ? "default" : "secondary"}
                      className={team.isActive ? "bg-green-600 text-white" : ""}>
                      {team.isActive ? "Aktywny" : "Nieaktywny"}
                    </Badge>
                  </TableCell>
                  <TableCell>{team._count.members}</TableCell>
                  <TableCell>{team._count.projects}</TableCell>
                  <TableCell>{team._count.users}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setManageTeam(team); setManageTab("members"); }}
                        title="Zarządzaj"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Czy na pewno chcesz usunąć team "${team.name}"?`)) {
                            deleteMutation.mutate(team.id);
                          }
                        }}
                        title="Usuń"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {teams.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Brak teamów. Utwórz pierwszy team.
            </p>
          )}
        </>
      )}

      {/* Create team dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowy team</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(createForm); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="teamName">Nazwa</Label>
              <Input
                id="teamName"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="np. Backend Team"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDesc">Opis (opcjonalnie)</Label>
              <Input
                id="teamDesc"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Krótki opis teamu"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Anuluj
              </Button>
              <Button type="submit" className="bg-[#F97316] hover:bg-[#EA580C]">
                Utwórz
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage team dialog */}
      <Dialog open={!!manageTeam} onOpenChange={(open) => { if (!open) setManageTeam(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zarządzaj teamem: {manageTeam?.name}</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b mb-4">
            {(["members", "projects", "users"] as ManageTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setManageTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  manageTab === tab
                    ? "border-[#F97316] text-[#F97316]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "members" ? "Osoby" : tab === "projects" ? "Projekty" : "Użytkownicy"}
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {manageTab === "members" &&
              allPersons.map((person) => {
                const inTeam = memberIds.has(person.id);
                return (
                  <div key={person.id} className="flex items-center gap-3 py-1">
                    <Checkbox
                      id={`person-${person.id}`}
                      checked={inTeam}
                      onCheckedChange={() => toggleMember(person.id, inTeam)}
                    />
                    <label htmlFor={`person-${person.id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{person.firstName} {person.lastName}</span>
                      <span className="text-muted-foreground text-sm ml-2">({person.section.name})</span>
                    </label>
                    {!person.isActive && <Badge variant="secondary">Nieaktywny</Badge>}
                  </div>
                );
              })}

            {manageTab === "projects" &&
              allProjects.map((project) => {
                const inTeam = projectIds.has(project.id);
                return (
                  <div key={project.id} className="flex items-center gap-3 py-1">
                    <Checkbox
                      id={`project-${project.id}`}
                      checked={inTeam}
                      onCheckedChange={() => toggleProject(project.id, inTeam)}
                    />
                    <label htmlFor={`project-${project.id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">({project.projectId})</span>
                    </label>
                    {!project.isActive && <Badge variant="secondary">Nieaktywny</Badge>}
                  </div>
                );
              })}

            {manageTab === "users" &&
              allUsers.map((user) => {
                const inTeam = userIds.has(user.id);
                return (
                  <div key={user.id} className="flex items-center gap-3 py-1">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={inTeam}
                      onCheckedChange={() => toggleUser(user.id, inTeam)}
                    />
                    <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">{user.email}</span>
                    </label>
                    <Badge variant="secondary" className={
                      user.role === "SUPER_ADMIN" ? "bg-indigo-600 text-white" :
                      user.role === "ADMIN" ? "bg-blue-600 text-white" : ""
                    }>
                      {user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "ADMIN" ? "Admin" : "Użytkownik"}
                    </Badge>
                  </div>
                );
              })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTeam(null)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
