"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        companyName: formData.get("companyName"),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Une erreur est survenue.");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
            <Building2 className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl">Créer un compte</CardTitle>
        <CardDescription>Commencez votre essai gratuit</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Votre nom</Label>
            <Input id="name" name="name" placeholder="Jean Dupont" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
            <Input id="companyName" name="companyName" placeholder="Mon Entreprise SPRL" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="vous@exemple.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Création...</>
            ) : (
              "Créer mon compte"
            )}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
          Déjà un compte ?{" "}
          <a href="/login" className="text-[var(--primary)] hover:underline font-medium">
            Se connecter
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
