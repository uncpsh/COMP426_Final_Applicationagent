/**
 * This file contains all of the Zod validation models used to ensure that
 * our tRPC API functions ultimately return data in the correct format.
 *
 * Each procedure passes its result through one of these models. Zod drops
 * every field that a model does not list, so database-only columns such as
 * `userId`, `shareToken` and `storagePath` can never leak to the browser by
 * accident.
 *
 * Dates are `Date` objects in TypeScript. On the wire superjson sends them
 * as ISO 8601 strings and turns them back into `Date` on the other side.
 *
 * To access the pure type of any Zod model, we can use:
 * z.infer<typeof Model>
 */

import { z } from "zod";
import { DocType, Kind, LetterStatus, Priority, Status } from "./enums";

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

const Id = z.string().uuid();
const Timestamp = z.date({ coerce: true });
const Count = z.number().int().min(0);

/** Defines the result of every `delete` / `remove` procedure. */
export const Deleted = z.object({ id: Id });

/* ------------------------------------------------------------------ */
/* profile                                                             */
/* ------------------------------------------------------------------ */

/** Defines the schema for the signed-in user. */
export const Me = z.object({
  id: Id,
  displayName: z.string(),
  email: z.string(),
});

/** Defines the result of editing the profile. */
export const ProfileName = z.object({ id: Id, displayName: z.string() });

/* ------------------------------------------------------------------ */
/* recommendations                                                     */
/* ------------------------------------------------------------------ */

/** Defines the schema for one letter that one recommender owes for one application. */
export const RecommendationRequest = z.object({
  id: Id,
  applicationId: Id,
  recommenderId: Id,
  status: LetterStatus,
  requestedAt: Timestamp.nullable(),
  /** Null means "use the application's deadline". */
  dueAt: Timestamp.nullable(),
  submittedAt: Timestamp.nullable(),
  notes: z.string().nullable(),
});

/* ------------------------------------------------------------------ */
/* applications                                                        */
/* ------------------------------------------------------------------ */

/** Defines the schema for an application. */
export const Application = z.object({
  id: Id,
  kind: Kind,
  organization: z.string(),
  position: z.string(),
  term: z.string().nullable(),
  status: Status,
  priority: Priority.nullable(),
  deadlineAt: Timestamp.nullable(),
  submittedAt: Timestamp.nullable(),
  portalUrl: z.string().nullable(),
  location: z.string().nullable(),
  applicationFeeCents: z.number().int().nullable(),
  notes: z.string().nullable(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

/** Defines a row of the applications list: the application plus its counts. */
export const ApplicationSummary = Application.extend({
  letters: z.object({ submitted: Count, total: Count }),
  documentCount: Count,
});

/** Defines the application detail page: the application, its letters and its documents. */
export const ApplicationDetail = Application.extend({
  letters: RecommendationRequest.extend({
    recommender: z.object({
      id: Id,
      name: z.string(),
      email: z.string().nullable(),
      title: z.string().nullable(),
    }),
  }).array(),
  documents: z
    .object({
      versionId: Id,
      versionNumber: z.number().int(),
      fileName: z.string(),
      attachedAt: Timestamp,
      document: z.object({
        id: Id,
        title: z.string(),
        type: DocType,
        /** Lets the UI show "newer version available". */
        latestVersionNumber: z.number().int(),
      }),
    })
    .array(),
});

/* ------------------------------------------------------------------ */
/* recommenders                                                        */
/* ------------------------------------------------------------------ */

/** Defines the schema for a recommender. `shareToken` is deliberately not included. */
export const Recommender = z.object({
  id: Id,
  name: z.string(),
  email: z.string().nullable(),
  title: z.string().nullable(),
  organization: z.string().nullable(),
  relationship: z.string().nullable(),
  notes: z.string().nullable(),
  shareEnabled: z.boolean(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

/** Defines how many of a recommender's letters are in each status. */
export const LetterCounts = z.object({
  planned: Count,
  requested: Count,
  confirmed: Count,
  submitted: Count,
  declined: Count,
});

/** Defines a row of the recommenders list. */
export const RecommenderWithStats = Recommender.extend({
  counts: LetterCounts,
  /** The earliest letter that is still owed; falls back to the application's deadline. */
  nextDueAt: Timestamp.nullable(),
});

/** Defines the recommender detail page: the recommender and their letters across applications. */
export const RecommenderDetail = Recommender.extend({
  letters: RecommendationRequest.extend({
    application: z.object({
      id: Id,
      organization: z.string(),
      position: z.string(),
      deadlineAt: Timestamp.nullable(),
      status: Status,
    }),
  }).array(),
});

/** Defines the state of a recommender's portal link. */
export const SharingState = z.object({
  shareEnabled: z.boolean(),
  /** The full `/r/[token]` link, or null while sharing is off. */
  shareUrl: z.string().nullable(),
});

/* ------------------------------------------------------------------ */
/* documents                                                           */
/* ------------------------------------------------------------------ */

// Named "Doc" rather than "Document" to avoid clashing with the DOM's global Document type.

/** Defines the schema for a logical document. */
export const Doc = z.object({
  id: Id,
  title: z.string(),
  type: DocType,
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

/** Defines the schema for one uploaded file. `storagePath` is deliberately not included. */
export const DocVersion = z.object({
  id: Id,
  documentId: Id,
  versionNumber: z.number().int(),
  fileName: z.string(),
  fileSizeBytes: z.number().int().nullable(),
  changeNote: z.string().nullable(),
  createdAt: Timestamp,
});

/** Defines a row of the documents list. */
export const DocSummary = Doc.extend({
  versionCount: Count,
  latestVersion: z
    .object({ id: Id, versionNumber: z.number().int(), createdAt: Timestamp })
    .nullable(),
  /** How many applications have any version of this document attached. */
  applicationCount: Count,
});

/** Defines the document detail page: the version history and where each version is used. */
export const DocDetail = Doc.extend({
  versions: DocVersion.extend({
    applications: z
      .object({
        id: Id,
        organization: z.string(),
        position: z.string(),
        status: Status,
      })
      .array(),
  }).array(),
});

/** Defines a short-lived link for downloading one version. */
export const DownloadUrl = z.object({
  url: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
});

/* ------------------------------------------------------------------ */
/* applicationDocuments                                                */
/* ------------------------------------------------------------------ */

/** Defines the result of attaching a version to an application. */
export const AttachedDocument = z.object({
  applicationId: Id,
  documentVersionId: Id,
  attachedAt: Timestamp,
});

/** Defines the result of detaching a version from an application. */
export const DetachedDocument = z.object({
  applicationId: Id,
  documentVersionId: Id,
});

/* ------------------------------------------------------------------ */
/* dashboard                                                           */
/* ------------------------------------------------------------------ */

/** Defines everything the dashboard shows, loaded in one request. */
export const DashboardSummary = z.object({
  countsByStatus: z.object({
    researching: Count,
    preparing: Count,
    submitted: Count,
    interviewing: Count,
    offer: Count,
    waitlisted: Count,
    rejected: Count,
    withdrawn: Count,
  }),
  /** Overdue items plus the next 30 days, sorted by due date. */
  upcoming: z
    .object({
      type: z.enum(["application", "letter"]),
      id: Id,
      applicationId: Id,
      title: z.string(),
      dueAt: Timestamp,
    })
    .array(),
  outstandingLetters: z
    .object({ recommenderId: Id, name: z.string(), pending: Count })
    .array(),
  /** Fees of the applications that have been submitted. */
  totalFeesCents: Count,
});

/* ------------------------------------------------------------------ */
/* portal (public)                                                     */
/* ------------------------------------------------------------------ */

/** Defines what a recommender sees through their portal link. No ids of the applicant leak. */
export const PortalView = z.object({
  recommenderName: z.string(),
  applicantName: z.string(),
  letters: z
    .object({
      id: Id,
      organization: z.string(),
      position: z.string(),
      dueAt: Timestamp.nullable(),
      status: LetterStatus,
    })
    .array(),
});

/** Defines the result of a recommender marking a letter as submitted. */
export const PortalSubmissionResult = z.object({
  id: Id,
  status: LetterStatus,
  submittedAt: Timestamp.nullable(),
});
