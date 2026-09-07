"use client";

import { useState } from "react";
import { btnPrimary, input, label } from "@/lib/ui";
import { setWorkExemption } from "./actions";

export default function DutyForm({
  members,
  year,
  selectedMemberId,
  options,
  currentReason,
}: {
  members: { id: number; firstName: string; lastName: string }[];
  year: number;
  selectedMemberId: number;
  options: string[];
  currentReason: string | null;
}) {
  const preset = currentReason && options.includes(currentReason) ? currentReason : currentReason ? "sonstiges" : "";
  const [duty, setDuty] = useState(preset);

  return (
    <form action={setWorkExemption} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="year" value={year} />
      <div>
        <label className={label} htmlFor="dutyMember">Mitglied</label>
        <select id="dutyMember" name="memberId" required defaultValue={selectedMemberId || ""} className={`${input} w-56`}>
          <option value="">Bitte wählen…</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.lastName}, {member.firstName}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="duty">Tätigkeit</label>
        <select id="duty" name="duty" required className={`${input} w-56`} value={duty} onChange={(event) => setDuty(event.target.value)}>
          <option value="">Bitte wählen…</option>
          {options.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
          <option value="sonstiges">Sonstiges…</option>
        </select>
      </div>
      {duty === "sonstiges" && (
        <div className="min-w-48 flex-1">
          <label className={label} htmlFor="custom">Bezeichnung</label>
          <input
            id="custom"
            name="custom"
            required
            defaultValue={preset === "sonstiges" ? currentReason ?? "" : ""}
            className={input}
            placeholder="z.B. Wasserwart"
          />
        </div>
      )}
      <button className={btnPrimary}>Für {year} als erfüllt merken</button>
    </form>
  );
}
