import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

const DEFAULT_USER_ID = "local";

export const extractions = sqliteTable("extractions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default(DEFAULT_USER_ID),
  source: text("source", { enum: ["paste", "url"] }).notNull(),
  sourceUrl: text("source_url"),
  sourceText: text("source_text").notNull(),
  status: text("status", { enum: ["pending", "processed", "failed"] })
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const proposedRules = sqliteTable("proposed_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  extractionId: integer("extraction_id")
    .notNull()
    .references(() => extractions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().default(DEFAULT_USER_ID),
  ruleJson: text("rule_json").notNull(),
  sourceQuote: text("source_quote"),
  status: text("status", {
    enum: ["proposed", "accepted", "rejected", "modified"],
  })
    .notNull()
    .default("proposed"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const overlays = sqliteTable("overlays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default(DEFAULT_USER_ID),
  name: text("name").notNull(),
  version: text("version").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const overlayRules = sqliteTable("overlay_rules", {
  overlayId: integer("overlay_id")
    .notNull()
    .references(() => overlays.id, { onDelete: "cascade" }),
  proposedRuleId: integer("proposed_rule_id")
    .notNull()
    .references(() => proposedRules.id, { onDelete: "cascade" }),
});

export type Extraction = typeof extractions.$inferSelect;
export type NewExtraction = typeof extractions.$inferInsert;
export type ProposedRule = typeof proposedRules.$inferSelect;
export type NewProposedRule = typeof proposedRules.$inferInsert;
export type Overlay = typeof overlays.$inferSelect;
export type NewOverlay = typeof overlays.$inferInsert;
