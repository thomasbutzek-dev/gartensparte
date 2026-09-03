import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { canManageMoney, getSessionUser } from "@/lib/auth";

function csvField(value: string | number | null): string {
  const text = String(value ?? "");
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !canManageMoney(user)) return new Response("Keine Berechtigung", { status: 403 });

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("jahr")) || new Date().getFullYear();

  const rows = db
    .select({
      lastName: tables.members.lastName,
      firstName: tables.members.firstName,
      type: tables.payments.type,
      description: tables.payments.description,
      amountCents: tables.payments.amountCents,
      paidCents: tables.payments.paidCents,
      paidAt: tables.payments.paidAt,
      dueDate: tables.payments.dueDate,
      dunningLevel: tables.payments.dunningLevel,
    })
    .from(tables.payments)
    .innerJoin(tables.members, eq(tables.payments.memberId, tables.members.id))
    .where(eq(tables.payments.year, year))
    .orderBy(asc(tables.members.lastName), asc(tables.members.firstName))
    .all();

  const header = ["Nachname", "Vorname", "Art", "Beschreibung", "Betrag EUR", "Bezahlt EUR", "Bezahlt am", "Faellig am", "Mahnstufe"];
  const lines = [header.join(";")];
  for (const row of rows) {
    lines.push(
      [
        csvField(row.lastName),
        csvField(row.firstName),
        csvField(row.type),
        csvField(row.description),
        csvField((row.amountCents / 100).toFixed(2).replace(".", ",")),
        csvField((row.paidCents / 100).toFixed(2).replace(".", ",")),
        csvField(row.paidAt),
        csvField(row.dueDate),
        csvField(row.dunningLevel),
      ].join(";"),
    );
  }

  // BOM, damit Excel Umlaute korrekt anzeigt
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="zahlungen-${year}.csv"`,
    },
  });
}
