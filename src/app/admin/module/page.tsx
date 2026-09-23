import { redirect } from "next/navigation";
import { canAdminister, requireUser } from "@/lib/auth";
import { listModules } from "@/lib/modules";
import SaveButton from "@/components/SaveButton";
import { card } from "@/lib/ui";
import { toggleModule } from "./actions";

export default async function ModulePage({ searchParams }: PageProps<"/admin/module">) {
  const user = await requireUser();
  if (!canAdminister(user)) redirect("/admin?fehler=rechte");
  const params = await searchParams;
  const modules = listModules();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Module</h1>
        <p className="mt-1 text-sm text-stone-500">
          Ausgeschaltet heißt: das Modul ist aus Menü, Übersicht, Akten und Schnittstellen verschwunden.
          Die Daten bleiben liegen und kommen beim Einschalten wieder.
        </p>
      </div>
      {params.ok && <p className="rounded-md bg-green-100 px-4 py-3 text-green-800">Modul gespeichert.</p>}
      <ul className="space-y-3">
        {modules.map((item) => (
          <li key={item.id} className={`${card} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3`}>
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              <p className="mt-1 text-sm text-stone-500">{item.description}</p>
              <p className="mt-1 text-sm">{item.enabled ? "An" : "Aus"}</p>
            </div>
            <form action={toggleModule}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="enabled" value={item.enabled ? "0" : "1"} />
              <SaveButton>{item.enabled ? "Ausschalten" : "Einschalten"}</SaveButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
