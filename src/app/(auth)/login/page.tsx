"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Email ou mot de passe incorrect.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30 mb-4">
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">CRM Devis</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">Connectez-vous à votre espace</p>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/80">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email" name="email" type="email"
                placeholder="vous@exemple.com"
                required autoComplete="email"
                className="h-11 bg-[var(--muted)] border-transparent focus:border-[var(--primary)] focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
              <Input
                id="password" name="password" type="password"
                placeholder="••••••••"
                required autoComplete="current-password"
                className="h-11 bg-[var(--muted)] border-transparent focus:border-[var(--primary)] focus:bg-white"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg">
                <span>⚠️</span> {error}
              </div>
            )}
            <Button type="submit" className="w-full h-11 text-sm font-semibold shadow-md shadow-blue-500/20" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Connexion...</> : "Se connecter"}
            </Button>
          </form>
          <div className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
            Pas encore de compte ?{" "}
            <a href="/register" className="text-[var(--primary)] hover:underline font-semibold">Créer un compte</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
