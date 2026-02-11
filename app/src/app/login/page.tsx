"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AmplitivLogo } from "@/components/amplitiv-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Nieprawidłowy email lub hasło");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source
          src="https://amplitiv.com/wp-content/themes/amplitiv/assets/hero_video_loop_01.mp4"
          type="video/mp4"
        />
      </video>

      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <AmplitivLogo className="h-12 w-auto text-white" />

        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-1 text-center pb-2">
            <h1 className="text-2xl font-bold tracking-tight">Zaloguj się</h1>
            <p className="text-sm text-muted-foreground">Planowanie zasobów</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@amplitiv.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Hasło</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white"
                disabled={loading}
              >
                {loading ? "Logowanie..." : "Zaloguj się"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
