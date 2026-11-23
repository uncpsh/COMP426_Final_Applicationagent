/**
 * The allowed values of every enum in the app, in one place.
 *
 * Both the database schema (`server/db/schema.ts`, as Postgres enums) and the
 * Zod models (`inputs.ts`, `responses.ts`) are built from these arrays, so the
 * database, the API and the UI can never disagree about what is valid.
 *
 * This file only depends on Zod on purpose: client components can import it
 * without pulling any server code into the browser bundle.
 */

import { z } from "zod";

export const APPLICATION_KINDS = ["grad_school", "internship"] as const;
export const Kind = z.enum(APPLICATION_KINDS);
export type Kind = z.infer<typeof Kind>;

export const APPLICATION_STATUSES = [
  "researching",
  "preparing",
  "submitted",
  "interviewing",
  "offer",
  "waitlisted",
  "rejected",
  "withdrawn",
] as const;
export const Status = z.enum(APPLICATION_STATUSES);
export type Status = z.infer<typeof Status>;

export const APPLICATION_PRIORITIES = ["reach", "target", "safety"] as const;
export const Priority = z.enum(APPLICATION_PRIORITIES);
export type Priority = z.infer<typeof Priority>;

export const LETTER_STATUSES = [
  "planned",
  "requested",
  "confirmed",
  "submitted",
  "declined",
] as const;
export const LetterStatus = z.enum(LETTER_STATUSES);
export type LetterStatus = z.infer<typeof LetterStatus>;

export const DOCUMENT_TYPES = [
  "sop",
  "personal_statement",
  "cv",
  "resume",
  "cover_letter",
  "writing_sample",
  "other",
] as const;
export const DocType = z.enum(DOCUMENT_TYPES);
export type DocType = z.infer<typeof DocType>;
