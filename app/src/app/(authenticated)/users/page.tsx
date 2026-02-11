"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { Plus, Pencil, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
}

type DialogMode = "create" | "edit" | "password" | null;

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "USER" as string });
  const [newPassword, setNewPassword] = useState("");

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = userRole === "ADMIN";

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => {
      if (!r.ok) throw new Error("Brak uprawnień");
      return r.json();
    }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string }) =>
      fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Błąd"); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
      toast.success("Użytkownik został utworzony");
    },
    onError: (e) => toast.error(e.message || "Nie udało się utworzyć użytkownika"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; email: string; role: string } }) =>
      fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Błąd"); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
      toast.success("Użytkownik został zaktualizowany");
    },
    onError: (e) => toast.error(e.message || "Nie udało się zaktualizować użytkownika"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      fetch(`/api/users/${id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Błąd"); });
        return r.json();
      }),
    onSuccess: () => {
      closeDialog();
      toast.success("Hasło zostało zmienione");
    },
    onError: (e) => toast.error(e.message || "Nie udało się zmienić hasła"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/users/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Błąd"); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Użytkownik został usunięty");
    },
    onError: (e) => toast.error(e.message || "Nie udało się usunąć użytkownika"),
  });

  function openCreate() {
    setDialogMode("create");
    setSelectedUser(null);
    setForm({ name: "", email: "", password: "", role: "USER" });
  }

  function openEdit(user: User) {
    setDialogMode("edit");
    setSelectedUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
  }

  function openPassword(user: User) {
    setDialogMode("password");
    setSelectedUser(user);
    setNewPassword("");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedUser(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dialogMode === "create") {
      createMutation.mutate(form);
    } else if (dialogMode === "edit" && selectedUser) {
      updateMutation.mutate({
        id: selectedUser.id,
        data: { name: form.name, email: form.email, role: form.role },
      });
    }
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedUser) {
      resetPasswordMutation.mutate({ id: selectedUser.id, newPassword });
    }
  }

  if (session && !isAdmin) {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Użytkownicy</h1>
          <p className="text-muted-foreground mt-1">Zarządzanie kontami użytkowników</p>
        </div>
        <Button onClick={openCreate} className="bg-[#F97316] hover:bg-[#EA580C]">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj użytkownika
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead className="w-32">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                      className={
                        user.role === "ADMIN"
                          ? "bg-[#F97316] text-white hover:bg-[#EA580C]"
                          : ""
                      }
                    >
                      {user.role === "ADMIN" ? "Admin" : "Użytkownik"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(user)}
                        title="Edytuj"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPassword(user)}
                        title="Zmień hasło"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {user.id !== (session?.user as { id?: string } | undefined)?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Czy na pewno chcesz usunąć tego użytkownika?")) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          title="Usuń"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Brak użytkowników.
            </p>
          )}
        </>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Dodaj użytkownika" : "Edytuj użytkownika"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Imię i nazwisko</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jan Kowalski"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jan@amplitiv.com"
                required
              />
            </div>
            {dialogMode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="password">Hasło</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 znaków"
                  required
                  minLength={6}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Rola</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Użytkownik</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Anuluj
              </Button>
              <Button type="submit" className="bg-[#F97316] hover:bg-[#EA580C]">
                {dialogMode === "create" ? "Dodaj" : "Zapisz"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={dialogMode === "password"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Zmień hasło — {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nowe hasło</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 znaków"
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Anuluj
              </Button>
              <Button type="submit" className="bg-[#F97316] hover:bg-[#EA580C]">
                Zmień hasło
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
