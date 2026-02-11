"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, FolderKanban, Users, Shield, LogOut, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { AmplitivLogo } from "@/components/amplitiv-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Panel główny", icon: LayoutDashboard },
  { href: "/projects", label: "Projekty", icon: FolderKanban },
  { href: "/people", label: "Osoby", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isAdmin = userRole === "ADMIN";

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Nowe hasła nie są identyczne");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd zmiany hasła");
      }

      toast.success("Hasło zostało zmienione");
      setPasswordDialogOpen(false);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zmiany hasła");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <>
      <aside className="flex h-screen w-64 flex-col bg-[#1E293B] text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <AmplitivLogo className="h-7 w-auto text-white" />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#F97316] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/users"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/users")
                  ? "bg-[#F97316] text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Shield className="h-5 w-5" />
              Użytkownicy
            </Link>
          )}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center justify-between px-3">
            <div className="truncate">
              <div className="text-sm font-medium truncate">{session?.user?.name}</div>
              <div className="text-xs text-white/50 truncate">{session?.user?.email}</div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPasswordDialogOpen(true)}
                className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                title="Zmień hasło"
              >
                <KeyRound className="h-4 w-4" />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                title="Wyloguj"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmień hasło</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Obecne hasło</Label>
              <Input
                id="oldPassword"
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nowe hasło</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Min. 6 znaków"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Anuluj
              </Button>
              <Button type="submit" className="bg-[#F97316] hover:bg-[#EA580C]" disabled={passwordLoading}>
                {passwordLoading ? "Zmieniam..." : "Zmień hasło"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
