import { canAdminister, canManageMoney, requireUser } from "@/lib/auth";
import AdminNav, { type AdminNavGroup } from "@/components/AdminNav";

const roleLabels = {
  admin: "Administrator",
  vorstand: "Vorstand",
  kassenwart: "Kassenwart",
} as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const groups: AdminNavGroup[] = [
    {
      title: "Heute",
      items: [
        { href: "/admin", label: "Übersicht" },
        { href: "/admin/posteingang", label: "Nachrichten" },
        { href: "/admin/warteliste", label: "Warteliste" },
        { href: "/admin/aufgaben", label: "Aufgaben" },
      ],
    },
    {
      title: "Anlage",
      items: [
        { href: "/admin/gaerten", label: "Gärten" },
        { href: "/admin/karte", label: "Lageplan" },
        { href: "/admin/mitglieder", label: "Mitglieder" },
        { href: "/admin/ablesen", label: "Strom ablesen" },
        { href: "/admin/arbeitsstunden", label: "Arbeitsstunden" },
      ],
    },
    ...(canManageMoney(user)
      ? [
          {
            title: "Kasse",
            items: [
              { href: "/admin/zahlungen", label: "Zahlungen" },
              { href: "/admin/schriftverkehr", label: "Briefe" },
            ],
          },
        ]
      : []),
    {
      title: "Öffentlich",
      items: [
        { href: "/admin/website", label: "Website" },
        { href: "/admin/termine", label: "Termine" },
        { href: "/admin/news", label: "News" },
        { href: "/admin/dokumente", label: "Dokumente" },
      ],
    },
    ...(canAdminister(user)
      ? [
          {
            title: "Zugang",
            items: [
              { href: "/admin/benutzer", label: "Konten" },
              { href: "/admin/einstellungen", label: "Einstellungen" },
            ],
          },
        ]
      : []),
  ];

  const roleLabel = roleLabels[user.role];
  const userLabel = user.name === roleLabel ? user.name : `${user.name} · ${roleLabel}`;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-stone-200 bg-green-900 text-white md:min-h-screen md:w-60 md:border-b-0">
        <AdminNav groups={groups} userLabel={userLabel} />
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
