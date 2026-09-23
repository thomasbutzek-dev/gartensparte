"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/auth";
import { listModules, setModuleEnabled, type ModuleId } from "@/lib/modules";

export async function toggleModule(formData: FormData) {
  await requireAdminRole();
  const id = String(formData.get("id") ?? "");
  const known = listModules().some((item) => item.id === id);
  if (!known) redirect("/admin/module");
  setModuleEnabled(id as ModuleId, formData.get("enabled") === "1");
  revalidatePath("/admin", "layout");
  redirect("/admin/module?ok=1");
}
