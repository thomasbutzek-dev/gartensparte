# Gartensparte – Website & Verwaltung

Vereinsverwaltung für eine Gartensparte plus öffentliche Website – als eine Anwendung. Die Anzahl der Gärten stellt der Vorstand unter Gärten ein.

**Stack:** Next.js (App Router, TypeScript), SQLite (better-sqlite3 + Drizzle ORM), Tailwind CSS, Zod, pdf-lib. Keine externen Dienste nötig; alle Daten liegen lokal im Ordner `data/`.

## Funktionen

### Öffentliche Website
- Startseite mit nächsten Terminen und News
- Termine, News, öffentliche Dokumente (Satzung, Formulare …)
- **Freie Gärten** mit anonymer Lageplan-Karte (keine Pächternamen), Kostenübersicht und Anfrageformular (Warteliste)
- Vorstand/Ansprechpartner, Kontaktformular (mit Spam-Schutz), Impressum, Datenschutz

### Verwaltung (`/admin`, nur mit Login)
- **Gärten:** digitale Akte je Garten – Stammdaten, Pächter mit Historie, Dokumente (Pachtvertrag, Abrechnungen …), Chronik, Zählerstände. Anzahl der Gärten einstellbar (Nummern 1 bis N). Schnellerfassung „Speichern & weiter“ für die Ersteingabe.
- **Karte:** Lageplan-Scan als Hintergrund, Parzellen einzeichnen und nachträglich ändern (Eckpunkte ziehen, Punkte ergänzen oder entfernen). Mouseover-Infos, Klick öffnet die Akte.
- **Mitglieder:** Stammdaten, Status (aktiv/ausgeschieden), Verknüpfung zu Gärten, Zahlungen, Stunden.
- **Zahlungen:** Jahres-Rechnungslauf (Pacht + Beitrag + Strom + fehlende Arbeitsstunden + Umlage) mit PDF je Mitglied, offene Posten, Überfällig-Ansicht, Teilzahlungen, Mahnstufen, CSV-Export für die Kassenprüfung.
- **Strom:** mobile „Ablese-Tour“ (Garten für Garten am Handy), Jahresverbrauch fließt automatisch in den Rechnungslauf.
- **Arbeitsstunden:** Soll/Ist je Mitglied; Fehlstunden werden im Rechnungslauf berechnet.
- **Schriftverkehr:** Vorlagen (Mahnung, Abmahnung, Kündigung nach BKleingG, Rundschreiben), erst Entwurf bearbeiten, dann PDF. Jahresrechnungslauf, Archiv.
- **Außerdem:** Termine & News mit Entwurf/Veröffentlicht, Aufgaben, Dokumentenverwaltung (öffentlich/intern), Warteliste, Posteingang (Kontaktformular), Benutzerverwaltung, Einstellungen (Beitragssätze, Briefkopf, Bankverbindung, Website-Texte).

### Rollen
| Rolle | Rechte |
|---|---|
| `admin` | alles, inkl. Benutzer & Einstellungen |
| `kassenwart` | alles Fachliche inkl. Zahlungen/Rechnungen/Mahnungen |
| `vorstand` | alles außer Kasse, Benutzer und Einstellungen |
| `demo` | alles anschauen (inkl. Kasse und Einstellungen), nichts speichern, keine Konten |

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest
npm run lint
node scripts/smoke.mjs http://localhost:3000   # E2E-Rauchtest gegen laufenden Server
```

Beim ersten Start wird automatisch angelegt: Admin-Konto (`admin` / `gartensparte-start`, per `ADMIN_START_PASSWORD` überschreibbar), Demo-Konto (`demo` / `gartensparte-demo`, per `DEMO_START_PASSWORD` überschreibbar) und Briefvorlagen. Die Gärten legt der Vorstand unter Gärten an (Anzahl 1 bis N). Ein bestehendes System bekommt das Demo-Konto nicht automatisch – dann unter Konten anlegen.

**Nach dem ersten Login sofort unter „Benutzer“ das Admin-Passwort ändern.**

## Betrieb mit Docker

```bash
ADMIN_START_PASSWORD='sicheres-startpasswort' docker compose up -d --build
```

- Anwendung: Port 3000
- Alle Daten (SQLite-DB, Uploads, PDFs) liegen im gemounteten Ordner `./data`

### VPS hinter Traefik
`compose.prod.yaml` nutzt das fertige Image `ghcr.io/thomasbutzek-dev/gartensparte` (gebaut per GitHub Actions bei jedem Push) und meldet sich per Labels bei einem laufenden Traefik an. Variablen: `SITE_DOMAIN` (Subdomain), `ADMIN_START_PASSWORD`. Daten liegen im Docker-Volume `gartensparte_data`.

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
