# Gartensparte – Website & Verwaltung

Komplette Vereinsverwaltung für eine Gartensparte mit 104 Gärten plus öffentliche Website – als eine Anwendung.

**Stack:** Next.js (App Router, TypeScript), SQLite (better-sqlite3 + Drizzle ORM), Tailwind CSS, Zod, pdf-lib. Keine externen Dienste nötig; alle Daten liegen lokal im Ordner `data/`.

## Funktionen

### Öffentliche Website
- Startseite mit nächsten Terminen und News
- Termine, News, öffentliche Dokumente (Satzung, Formulare …)
- **Freie Gärten** mit anonymer Lageplan-Karte (keine Pächternamen), Kostenübersicht und Anfrageformular (Warteliste)
- Vorstand/Ansprechpartner, Kontaktformular (mit Spam-Schutz), Impressum, Datenschutz

### Verwaltung (`/admin`, nur mit Login)
- **Gärten:** digitale Akte je Garten – Stammdaten, Pächter mit Historie, Dokumente (Pachtvertrag, Abrechnungen …), Chronik, Zählerstände. Schnellerfassung „Speichern & weiter“ für die Ersteingabe aller 104 Gärten.
- **Karte:** Lageplan-Scan als Hintergrund, Parzellen als Polygone einzeichnen (Eckpunkte klicken), Mouseover-Infos, Klick öffnet die Akte. Korrektur = löschen und neu zeichnen.
- **Mitglieder:** Stammdaten, Status (aktiv/ausgeschieden), Verknüpfung zu Gärten, Zahlungen, Stunden.
- **Zahlungen:** Jahres-Rechnungslauf (Pacht + Beitrag + Strom + fehlende Arbeitsstunden + Umlage) mit PDF je Mitglied, offene Posten, Überfällig-Ansicht, Teilzahlungen, Mahnstufen, CSV-Export für die Kassenprüfung.
- **Strom:** mobile „Ablese-Tour“ (Garten für Garten am Handy), Jahresverbrauch fließt automatisch in den Rechnungslauf.
- **Arbeitsstunden:** Soll/Ist je Mitglied; Fehlstunden werden im Rechnungslauf berechnet.
- **Schriftverkehr:** Rechnungen, Mahnungen (2 Stufen), Kündigungen, Rundschreiben als Sammel-PDF – alle Vorlagen mit Platzhaltern im Adminbereich editierbar. Alle PDFs im Archiv.
- **Außerdem:** Termine & News mit Entwurf/Veröffentlicht, Aufgaben, Dokumentenverwaltung (öffentlich/intern), Warteliste, Posteingang (Kontaktformular), Benutzerverwaltung, Einstellungen (Beitragssätze, Briefkopf, Bankverbindung, Website-Texte).

### Rollen
| Rolle | Rechte |
|---|---|
| `admin` | alles, inkl. Benutzer & Einstellungen |
| `kassenwart` | alles Fachliche inkl. Zahlungen/Rechnungen/Mahnungen |
| `vorstand` | alles außer Kasse, Benutzer und Einstellungen |

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest
npm run lint
node scripts/smoke.mjs http://localhost:3000   # E2E-Rauchtest gegen laufenden Server
```

Beim ersten Start wird automatisch angelegt: Admin-Konto (`admin` / `gartensparte-start`, per `ADMIN_START_PASSWORD` überschreibbar), 104 Gärten, Briefvorlagen.

**Nach dem ersten Login sofort unter „Benutzer“ das Admin-Passwort ändern.**

## Betrieb mit Docker

```bash
ADMIN_START_PASSWORD='sicheres-startpasswort' docker compose up -d --build
```

- Anwendung: Port 3000
- Alle Daten (SQLite-DB, Uploads, PDFs) liegen im gemounteten Ordner `./data`

### Sicherung
Der komplette Zustand steckt im Ordner `data/`. Sicherung = Ordner kopieren (bei laufendem Betrieb idealerweise Container kurz stoppen oder `sqlite3 data/gartensparte.sqlite ".backup ..."` verwenden). Empfehlung: tägliche Kopie per Cron/Aufgabenplanung auf ein zweites Medium.

## Struktur

```
src/db/            Schema, Migrationen, Seed (SQLite via Drizzle)
src/lib/           Auth/Sessions, Einstellungen, PDF-Erzeugung, Uploads, Karte
src/app/(public)/  Öffentliche Seiten
src/app/admin/     Verwaltung (je Modul: page.tsx + actions.ts)
src/app/api/       Dateiauslieferung (Dokumente, Briefe, Lageplan)
data/              Laufzeitdaten – nicht im Git, sichern!
```

## Hinweise
- **Kündigungen:** Das erzeugte PDF wahrt nicht die gesetzliche Schriftform – ausdrucken, unterschreiben und nachweisbar zustellen (Einwurf-Einschreiben/Zeugen).
- **Rechnungslauf** ist idempotent: Mitglieder mit bereits berechnetem Jahresbeitrag werden übersprungen.
- Zähler ohne Vorjahres-Ablesung werden im Rechnungslauf ohne Stromposition abgerechnet (Position kann manuell ergänzt werden).
