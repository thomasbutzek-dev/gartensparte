// End-to-End-Rauchtest gegen einen laufenden Server:
// Login mit dem geseedeten Admin-Konto, danach Aufruf aller Admin-Seiten.
// Aufruf: node scripts/smoke.mjs [baseUrl] [passwort]

const base = process.argv[2] ?? "http://localhost:3001";
const password = process.argv[3] ?? process.env.ADMIN_START_PASSWORD ?? "gartensparte-start";

function fail(message) {
  console.error(`FEHLER: ${message}`);
  process.exit(1);
}

// 1. Login-Seite laden und Action-ID des Formulars extrahieren
const loginPage = await fetch(`${base}/login`);
if (!loginPage.ok) fail(`/login liefert ${loginPage.status}`);
const html = await loginPage.text();
const actionMatch = html.match(/name="\$ACTION_ID_([a-f0-9]+)"/);
if (!actionMatch) fail("Keine Server-Action-ID im Login-Formular gefunden");

// 2. Formular absenden
const form = new FormData();
form.set(`$ACTION_ID_${actionMatch[1]}`, "");
form.set("username", "admin");
form.set("password", password);
const login = await fetch(`${base}/login`, { method: "POST", body: form, redirect: "manual" });
const setCookie = login.headers.get("set-cookie") ?? "";
const sessionMatch = setCookie.match(/session=([^;]+)/);
if (login.status !== 303 && login.status !== 302) fail(`Login-POST liefert ${login.status} statt Redirect`);
if (!sessionMatch) fail(`Kein Session-Cookie gesetzt (Redirect nach: ${login.headers.get("location")})`);
const cookie = `session=${sessionMatch[1]}`;
console.log(`Login OK (Redirect nach ${login.headers.get("location")})`);

// 3. Admin-Seiten mit Session aufrufen
const pages = [
  "/admin",
  "/admin/gaerten",
  "/admin/gaerten/erfassen?nr=1",
  "/admin/karte",
  "/admin/mitglieder",
  "/admin/mitglieder/neu",
  "/admin/warteliste",
  "/admin/zahlungen",
  "/admin/zahlungen/export?jahr=2026",
  "/admin/ablesen",
  "/admin/ablesen?nr=1",
  "/admin/arbeitsstunden",
  "/admin/schriftverkehr",
  "/admin/schriftverkehr/vorlagen",
  "/admin/termine",
  "/admin/news",
  "/admin/aufgaben",
  "/admin/dokumente",
  "/admin/posteingang",
  "/admin/benutzer",
  "/admin/website",
  "/admin/einstellungen",
];
let failures = 0;
for (const path of pages) {
  const response = await fetch(`${base}${path}`, { headers: { cookie }, redirect: "manual" });
  const ok = response.status === 200;
  console.log(`${ok ? "OK " : "!! "} ${response.status} ${path}`);
  if (!ok) failures++;
}

// 4. Ohne Session muss /admin umleiten
const guarded = await fetch(`${base}/admin`, { redirect: "manual" });
if (guarded.status !== 307 && guarded.status !== 308 && guarded.status !== 303) {
  fail(`/admin ohne Login liefert ${guarded.status} statt Redirect`);
}
console.log("Zugriffsschutz OK (Redirect ohne Session)");

if (failures > 0) fail(`${failures} Admin-Seite(n) fehlerhaft`);
console.log("Rauchtest bestanden.");
