import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — CRM Devis",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      {children}
    </div>
  );
}
