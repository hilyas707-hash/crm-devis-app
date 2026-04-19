import { Header } from "@/components/layout/header";
import { ClientForm } from "@/components/clients/client-form";
import { createClient } from "@/actions/clients";

export default function NewClientPage() {
  return (
    <div>
      <Header title="Nouveau client" />
      <div className="p-6 max-w-2xl">
        <ClientForm action={createClient} />
      </div>
    </div>
  );
}
