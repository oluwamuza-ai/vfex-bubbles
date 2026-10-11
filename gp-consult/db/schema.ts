import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import type { CardBody } from "@/lib/schemas/card";
import type { CaseFile } from "@/lib/schemas/case";
import type { ChatTurn, ExamRecord, InvestigationRecord, PlanSubmission } from "@/lib/schemas/consult";
import type { StoredGrade } from "@/lib/schemas/grade";

// Portability note: only text/integer/real columns and JSON-as-text are used, so
// switching to Turso (libsql) is a driver swap and Postgres is a mechanical port
// (text→text, integer→integer/bigint, json text→jsonb).

export const conditionCards = sqliteTable("condition_cards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
  body: text("body", { mode: "json" }).$type<CardBody>().notNull(),
  guidelineDate: text("guideline_date").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at").notNull(),
});

export const caseFiles = sqliteTable("case_files", {
  id: text("id").primaryKey(),
  conditionId: text("condition_id").notNull().references(() => conditionCards.id),
  tier: integer("tier").notNull(),
  data: text("data", { mode: "json" }).$type<CaseFile>().notNull(),
  model: text("model").notNull(),
  createdAt: integer("created_at").notNull(),
  usedAt: integer("used_at"),
});

export const consultations = sqliteTable("consultations", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => caseFiles.id),
  conditionId: text("condition_id").notNull(),
  specialty: text("specialty").notNull(),
  tier: integer("tier").notNull(),
  clinicSessionId: text("clinic_session_id"),
  status: text("status", { enum: ["active", "submitted", "graded"] }).notNull(),
  timed: integer("timed", { mode: "boolean" }).notNull().default(false),
  transcript: text("transcript", { mode: "json" }).$type<ChatTurn[]>().notNull(),
  exams: text("exams", { mode: "json" }).$type<ExamRecord[]>().notNull(),
  investigations: text("investigations", { mode: "json" }).$type<InvestigationRecord[]>().notNull(),
  plan: text("plan", { mode: "json" }).$type<PlanSubmission>(),
  grade: text("grade", { mode: "json" }).$type<StoredGrade>(),
  overallScore: integer("overall_score"),
  ratingBefore: real("rating_before"),
  ratingAfter: real("rating_after"),
  xpAwarded: integer("xp_awarded"),
  startedAt: integer("started_at").notNull(),
  submittedAt: integer("submitted_at"),
  gradedAt: integer("graded_at"),
});

export const mastery = sqliteTable("mastery", {
  conditionId: text("condition_id").primaryKey(),
  rating: real("rating").notNull(),
  attempts: integer("attempts").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  ease: real("ease").notNull().default(2.5),
  intervalDays: real("interval_days").notNull().default(0),
  dueAt: integer("due_at").notNull(),
  lastScore: integer("last_score"),
  lastSeenAt: integer("last_seen_at"),
});

export const specialtyMastery = sqliteTable("specialty_mastery", {
  specialty: text("specialty").primaryKey(),
  rating: real("rating").notNull(),
  attempts: integer("attempts").notNull().default(0),
});

export const xpEvents = sqliteTable("xp_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  day: text("day").notNull(), // YYYY-MM-DD local day, for streaks
  at: integer("at").notNull(),
});

export const clinicSessions = sqliteTable("clinic_sessions", {
  id: text("id").primaryKey(),
  consultationIds: text("consultation_ids", { mode: "json" }).$type<string[]>().notNull(),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
});

export type RapidFireAnswer = "urgent" | "routine" | "safetynet";

export const rapidFireItems = sqliteTable("rapid_fire_items", {
  id: text("id").primaryKey(),
  conditionId: text("condition_id"),
  vignette: text("vignette").notNull(),
  answer: text("answer", { enum: ["urgent", "routine", "safetynet"] }).notNull(),
  rationale: text("rationale").notNull(),
  source: text("source").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const rapidFireRounds = sqliteTable("rapid_fire_rounds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  correct: integer("correct").notNull(),
  answered: integer("answered").notNull(),
  at: integer("at").notNull(),
});

export const cardRevisions = sqliteTable("card_revisions", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull().references(() => conditionCards.id),
  proposedBody: text("proposed_body", { mode: "json" }).$type<CardBody>().notNull(),
  proposedGuidelineDate: text("proposed_guideline_date").notNull(),
  summary: text("summary").notNull(),
  hasChanges: integer("has_changes", { mode: "boolean" }).notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
});
