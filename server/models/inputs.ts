/**
 * This file contains all of the Zod validation models used to ensure that
 * our tRPC API functions accept input data in the correct format.
 *
 * Every procedure validates its input with one of these models before any
 * of its own code runs, so a procedure can trust the shape of `input`.
 *
 * To access the pure type of any Zod model, we can use:
 * z.infer<typeof Model>
 */

import { z } from "zod";
import {
  APPLICATION_STATUSES,
  DocType,
  Kind,
  LetterStatus,
  Priority,
  Status,
} from "./enums";

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** Files in the `documents` bucket may be at most 10 MB (the bucket enforces it too). */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const Id = z.string().uuid();

/** Text that must be present: trimmed, not empty, at most `max` characters. */
const requiredText = (max: number) => z.string().trim().min(1).max(max);

/**
 * Text that may be left out. An empty string and `null` both mean "no value",
 * so a form can send its fields as they are and an edit can clear a field.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

/** An optional email address, with the same "empty means none" rule. */
const optionalEmail = z
  .union([z.literal(""), z.string().trim().max(320).email()])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/**
 * An optional web link. Only http(s) is allowed because the UI renders it as
 * a clickable link, and a `javascript:` URL there would run code.
 */
const optionalUrl = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(2000)
      .url()
      .refine((value) => /^https?:\/\//i.test(value), {
        message: "The link must start with http:// or https://",
      }),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/**
 * An optional point in time. The client sends a `Date` (superjson turns it
 * into an ISO 8601 string on the wire); a plain ISO string is accepted too.
 */
const optionalDate = z.coerce.date().nullable().optional();

/* ------------------------------------------------------------------ */
/* profile                                                             */
/* ------------------------------------------------------------------ */

/** Defines the schema for editing the signed-in user's profile. */
export const ProfileUpdate = z.object({ displayName: requiredText(80) });

/* ------------------------------------------------------------------ */
/* applications                                                        */
/* ------------------------------------------------------------------ */

/** Defines the schema for an application identity. */
export const ApplicationIdentity = z.object({ id: Id });

/** Defines the filters, search and sort order of the applications list. */
export const ApplicationListFilters = z
  .object({
    kind: Kind.optional(),
    statuses: Status.array().max(APPLICATION_STATUSES.length).optional(),
    /** Matches the organization or the position. */
    search: z.string().trim().max(100).optional(),
    sort: z.enum(["deadline", "updated", "organization"]).optional(),
  })
  .default({});

/** The optional fields shared by "create" and "update". */
const applicationOptionalFields = {
  term: optionalText(50),
  status: Status.optional(),
  priority: Priority.nullable().optional(),
  deadlineAt: optionalDate,
  portalUrl: optionalUrl,
  location: optionalText(200),
  applicationFeeCents: z
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .nullable()
    .optional(),
  notes: optionalText(5000),
};

/** Defines the schema for a new application. */
export const DraftApplication = z.object({
  kind: Kind,
  organization: requiredText(200),
  position: requiredText(200),
  ...applicationOptionalFields,
});

/** Defines the schema for editing an application: its id plus any field. */
export const ApplicationUpdate = z.object({
  id: Id,
  kind: Kind.optional(),
  organization: requiredText(200).optional(),
  position: requiredText(200).optional(),
  ...applicationOptionalFields,
});

/** Defines the schema for changing only the status (the inline select). */
export const ApplicationStatusUpdate = z.object({ id: Id, status: Status });

/* ------------------------------------------------------------------ */
/* recommenders                                                        */
/* ------------------------------------------------------------------ */

/** Defines the schema for a recommender identity. */
export const RecommenderIdentity = z.object({ id: Id });

const recommenderOptionalFields = {
  email: optionalEmail,
  title: optionalText(200),
  organization: optionalText(200),
  relationship: optionalText(200),
  notes: optionalText(5000),
};

/** Defines the schema for a new recommender. */
export const DraftRecommender = z.object({
  name: requiredText(200),
  ...recommenderOptionalFields,
});

/** Defines the schema for editing a recommender: their id plus any field. */
export const RecommenderUpdate = z.object({
  id: Id,
  name: requiredText(200).optional(),
  ...recommenderOptionalFields,
});

/** Defines the schema for turning the recommender portal link on or off. */
export const RecommenderSharing = z.object({
  id: Id,
  enabled: z.boolean(),
  /** Replaces the secret in the link, so the old link stops working. */
  regenerateToken: z.boolean().optional(),
});

/* ------------------------------------------------------------------ */
/* recommendations (the applications <-> recommenders join)            */
/* ------------------------------------------------------------------ */

/** Defines the schema for a letter (recommendation request) identity. */
export const RecommendationIdentity = z.object({ id: Id });

/** Defines the schema for asking a recommender for a letter. */
export const RecommendationAssignment = z.object({
  applicationId: Id,
  recommenderId: Id,
  dueAt: optionalDate,
});

/** Defines the schema for editing a letter. */
export const RecommendationUpdate = z.object({
  id: Id,
  status: LetterStatus.optional(),
  dueAt: optionalDate,
  notes: optionalText(5000),
});

/* ------------------------------------------------------------------ */
/* documents                                                           */
/* ------------------------------------------------------------------ */

/** Defines the schema for a document identity. */
export const DocumentIdentity = z.object({ id: Id });

/** Defines the filter of the documents list. */
export const DocumentListFilters = z
  .object({ type: DocType.optional() })
  .default({});

/** Defines the schema for a new (still empty) document. */
export const DraftDocument = z.object({
  title: requiredText(200),
  type: DocType,
});

/** Defines the schema for renaming or re-typing a document. */
export const DocumentUpdate = z.object({
  id: Id,
  title: requiredText(200).optional(),
  type: DocType.optional(),
});

/**
 * Defines the schema for recording a file that the browser has already
 * uploaded to Storage. The procedure also checks that `storagePath` starts
 * with the signed-in user's id.
 */
export const DraftDocumentVersion = z.object({
  documentId: Id,
  storagePath: z.string().min(1).max(1024),
  fileName: requiredText(255),
  fileSizeBytes: z.number().int().positive().max(MAX_DOCUMENT_SIZE_BYTES),
  changeNote: optionalText(500),
});

/** Defines the schema for a document version identity. */
export const DocumentVersionIdentity = z.object({ versionId: Id });

/* ------------------------------------------------------------------ */
/* applicationDocuments (the applications <-> document_versions join)  */
/* ------------------------------------------------------------------ */

/** Defines the schema for attaching or detaching one version on one application. */
export const ApplicationDocumentLink = z.object({
  applicationId: Id,
  documentVersionId: Id,
});

/* ------------------------------------------------------------------ */
/* portal (public)                                                     */
/* ------------------------------------------------------------------ */

/** Defines the schema for the secret in a recommender portal link. */
export const PortalToken = z.object({ token: Id });

/** Defines the schema for a recommender marking one of their letters as submitted. */
export const PortalSubmission = z.object({ token: Id, requestId: Id });
