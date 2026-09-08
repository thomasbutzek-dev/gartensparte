import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// ---------- Benutzer & Sitzungen (Vorstand-Konten) ----------

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "vorstand", "kassenwart"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // SHA-256-Hash des Tokens
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(), // Unix ms
});

// ---------- Mitglieder ----------

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  street: text("street").notNull().default(""),
  zip: text("zip").notNull().default(""),
  city: text("city").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  memberSince: text("member_since"), // ISO-Datum
  status: text("status", { enum: ["aktiv", "ausgeschieden"] }).notNull().default("aktiv"),
  leftAt: text("left_at"),
  note: text("note").notNull().default(""),
});

// ---------- Gärten & Akten ----------

export const gardens = sqliteTable(
  "gardens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: integer("number").notNull(),
    sizeSqm: real("size_sqm"),
    status: text("status", { enum: ["verpachtet", "frei", "kuendigung", "entfaellt"] })
      .notNull()
      .default("frei"),
    attributes: text("attributes").notNull().default("[]"),
    meterNumber: text("meter_number").notNull().default(""),
    note: text("note").notNull().default(""),
    // Polygon im SVG-Koordinatensystem: JSON [[x,y],...]
    polygon: text("polygon"),
  },
  (t) => [uniqueIndex("gardens_number_unique").on(t.number)],
);

// Pächterhistorie: aktueller Pächter = Eintrag ohne endDate
export const tenancies = sqliteTable(
  "tenancies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gardenId: integer("garden_id").notNull().references(() => gardens.id, { onDelete: "cascade" }),
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "restrict" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
  },
  (t) => [index("tenancies_garden_idx").on(t.gardenId), index("tenancies_member_idx").on(t.memberId)],
);

export const gardenDocuments = sqliteTable(
  "garden_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gardenId: integer("garden_id").notNull().references(() => gardens.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("sonstiges"), // pachtvertrag, strom, foto, sonstiges
    fileName: text("file_name").notNull(), // Dateiname in data/uploads/gaerten
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    uploadedAt: text("uploaded_at").notNull(),
    uploadedBy: integer("uploaded_by").references(() => users.id),
  },
  (t) => [index("garden_documents_garden_idx").on(t.gardenId)],
);

export const gardenNotes = sqliteTable(
  "garden_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gardenId: integer("garden_id").notNull().references(() => gardens.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    authorId: integer("author_id").references(() => users.id),
    text: text("text").notNull(),
  },
  (t) => [index("garden_notes_garden_idx").on(t.gardenId)],
);

export const meterReadings = sqliteTable(
  "meter_readings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gardenId: integer("garden_id").notNull().references(() => gardens.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    value: real("value").notNull(), // kWh-Zählerstand
    readBy: integer("read_by").references(() => users.id),
    note: text("note").notNull().default(""),
  },
  (t) => [index("meter_readings_garden_idx").on(t.gardenId)],
);

// ---------- Arbeitsstunden ----------

export const workHours = sqliteTable(
  "work_hours",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    hours: real("hours").notNull(),
    activity: text("activity").notNull().default(""),
  },
  (t) => [index("work_hours_member_idx").on(t.memberId)],
);

/** Sondertätigkeit/Befreiung: das Jahressoll gilt als erfüllt. */
export const workExemptions = sqliteTable(
  "work_exemptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    reason: text("reason").notNull(),
  },
  (t) => [uniqueIndex("work_exemptions_member_year").on(t.memberId, t.year)],
);

// ---------- Termine, Aufgaben, News ----------

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  date: text("date").notNull(), // ISO, ggf. mit Uhrzeit
  endDate: text("end_date"),
  location: text("location").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["entwurf", "veroeffentlicht"] }).notNull().default("entwurf"),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  assignee: text("assignee").notNull().default(""), // Freitext: Name/Gruppe
  status: text("status", { enum: ["offen", "in_arbeit", "erledigt"] }).notNull().default("offen"),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
});

export const news = sqliteTable("news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["entwurf", "veroeffentlicht"] }).notNull().default("entwurf"),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
});

// ---------- Vereinsdokumente (öffentlich/intern) ----------

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull().default("sonstiges"), // satzung, gartenordnung, formular, protokoll, sonstiges
  fileName: text("file_name").notNull(), // Dateiname in data/uploads/dokumente
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  uploadedAt: text("uploaded_at").notNull(),
});

// ---------- Zahlungen / offene Posten ----------

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "restrict" }),
    gardenId: integer("garden_id").references(() => gardens.id, { onDelete: "set null" }),
    year: integer("year").notNull(),
    type: text("type", {
      enum: ["beitrag", "pacht", "strom", "arbeitsstunden", "umlage", "sonstiges"],
    }).notNull(),
    description: text("description").notNull().default(""),
    amountCents: integer("amount_cents").notNull(),
    dueDate: text("due_date"),
    paidCents: integer("paid_cents").notNull().default(0),
    paidAt: text("paid_at"),
    dunningLevel: integer("dunning_level").notNull().default(0),
    dunnedAt: text("dunned_at"),
    letterId: integer("letter_id"), // Rechnung, auf der der Posten steht
  },
  (t) => [index("payments_member_idx").on(t.memberId), index("payments_year_idx").on(t.year)],
);

// ---------- Schriftverkehr ----------

export const letters = sqliteTable(
  "letters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(), // rechnung, mahnung, abmahnung, kuendigung, rundschreiben, sonstiges
    number: text("number"), // Rechnungsnummer, z.B. 2026-001
    memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
    gardenId: integer("garden_id").references(() => gardens.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    body: text("body").notNull().default(""),
    fileName: text("file_name").notNull(), // PDF in data/letters; leer = Entwurf
    status: text("status", { enum: ["entwurf", "fertig"] }).notNull().default("fertig"),
    createdAt: text("created_at").notNull(),
    createdBy: integer("created_by").references(() => users.id),
  },
  (t) => [index("letters_member_idx").on(t.memberId), index("letters_garden_idx").on(t.gardenId)],
);

export const letterTemplates = sqliteTable("letter_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull().unique(),
  name: text("name").notNull().default(""),
  letterGroup: text("letter_group").notNull().default("sonstiges"),
  effect: text("effect").notNull().default("none"), // none | kuendigung
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------- Interessenten & Kontakt ----------

export const applicants = sqliteTable("applicants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  desiredSize: text("desired_size").notNull().default(""),
  message: text("message").notNull().default(""),
  createdAt: text("created_at").notNull(),
  status: text("status", { enum: ["offen", "kontaktiert", "vergeben", "zurueckgezogen"] })
    .notNull()
    .default("offen"),
  note: text("note").notNull().default(""),
  gardenId: integer("garden_id").references(() => gardens.id, { onDelete: "set null" }),
});

export const inquiries = sqliteTable("inquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  subject: text("subject").notNull().default(""),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
});

// ---------- Öffentlicher Auftritt ----------

export const galleryImages = sqliteTable("gallery_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileName: text("file_name").notNull(),
  caption: text("caption").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  showOnHome: integer("show_on_home", { mode: "boolean" }).notNull().default(true),
  uploadedAt: text("uploaded_at").notNull(),
});

export const boardMembers = sqliteTable("board_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  photoFile: text("photo_file"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------- Einstellungen (Key/Value, JSON-Werte) ----------

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
