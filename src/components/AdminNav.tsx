"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";

export type AdminNavItem = { href: string; label: string };
export type AdminNavGroup = { title: string; items: AdminNavItem[] };

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav({ groups, userLabel }: { groups: AdminNavGroup[]; userLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div>
          <Link href="/admin" className="font-bold">
            Verwaltung
          </Link>
          <p className="text-xs text-green-200">{userLabel}</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-green-600 px-3 py-1.5 text-sm md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Menü schließen" : "Menü"}
        </button>
      </div>
      <nav className={`${open ? "block" : "hidden"} px-2 pb-4 text-sm md:block`}>
        {groups.map((group) => (
          <div key={group.title} className="mt-3 first:mt-0">
            <p className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-green-300/80">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 ${
                    active ? "bg-green-800 font-medium" : "hover:bg-green-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
        <form action={logoutAction} className="mt-6">
          <button className="w-full rounded-md px-3 py-2 text-left text-green-200 hover:bg-green-800">
            Abmelden
          </button>
        </form>
      </nav>
    </>
  );
}
