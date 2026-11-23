/**
 * This file defines all of the relations between the tables in our database
 * schema using Drizzle's `defineRelations()` API (Relational Queries v2).
 *
 * Relations do *not* change the structure of the database (the foreign keys
 * in `schema.ts` do that). They tell Drizzle how tables connect so that we
 * can load nested data with `db.query.<table>.findMany({ with: { ... } })`.
 *
 * - `r.one.<table>({ from, to })` is the "one" side of a many-to-one.
 * - `r.many.<table>({ from, to })` is the "many" side.
 * - `.through(...)` is a many-to-many that goes through a join table.
 *
 * @see https://orm.drizzle.team/docs/relations-v2
 */

import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  /**
   * A profile (user) owns *many* applications, recommenders and documents.
   */
  profilesTable: {
    applications: r.many.applicationsTable({
      from: r.profilesTable.id,
      to: r.applicationsTable.userId,
    }),
    recommenders: r.many.recommendersTable({
      from: r.profilesTable.id,
      to: r.recommendersTable.userId,
    }),
    documents: r.many.documentsTable({
      from: r.profilesTable.id,
      to: r.documentsTable.userId,
    }),
  },

  /**
   * An application:
   * - belongs to *one* profile (many-to-one);
   * - has *many* letters (rows of the `recommendation_requests` join table);
   * - is linked to *many* recommenders through those letters (many-to-many);
   * - has *many* attachments (rows of the `application_documents` join table);
   * - is linked to *many* document versions through them (many-to-many).
   */
  applicationsTable: {
    user: r.one.profilesTable({
      from: r.applicationsTable.userId,
      to: r.profilesTable.id,
      optional: false,
    }),
    letters: r.many.recommendationRequestsTable({
      from: r.applicationsTable.id,
      to: r.recommendationRequestsTable.applicationId,
    }),
    recommenders: r.many.recommendersTable({
      from: r.applicationsTable.id.through(
        r.recommendationRequestsTable.applicationId,
      ),
      to: r.recommendersTable.id.through(
        r.recommendationRequestsTable.recommenderId,
      ),
    }),
    attachments: r.many.applicationDocumentsTable({
      from: r.applicationsTable.id,
      to: r.applicationDocumentsTable.applicationId,
    }),
    documentVersions: r.many.documentVersionsTable({
      from: r.applicationsTable.id.through(
        r.applicationDocumentsTable.applicationId,
      ),
      to: r.documentVersionsTable.id.through(
        r.applicationDocumentsTable.documentVersionId,
      ),
    }),
  },

  /**
   * A recommender belongs to *one* profile, owes *many* letters, and is
   * linked to *many* applications through those letters (many-to-many).
   */
  recommendersTable: {
    user: r.one.profilesTable({
      from: r.recommendersTable.userId,
      to: r.profilesTable.id,
      optional: false,
    }),
    letters: r.many.recommendationRequestsTable({
      from: r.recommendersTable.id,
      to: r.recommendationRequestsTable.recommenderId,
    }),
    applications: r.many.applicationsTable({
      from: r.recommendersTable.id.through(
        r.recommendationRequestsTable.recommenderId,
      ),
      to: r.applicationsTable.id.through(
        r.recommendationRequestsTable.applicationId,
      ),
    }),
  },

  /**
   * A letter (join row) is for exactly *one* application and written by
   * exactly *one* recommender.
   */
  recommendationRequestsTable: {
    application: r.one.applicationsTable({
      from: r.recommendationRequestsTable.applicationId,
      to: r.applicationsTable.id,
      optional: false,
    }),
    recommender: r.one.recommendersTable({
      from: r.recommendationRequestsTable.recommenderId,
      to: r.recommendersTable.id,
      optional: false,
    }),
  },

  /**
   * A document belongs to *one* profile and has *many* versions.
   */
  documentsTable: {
    user: r.one.profilesTable({
      from: r.documentsTable.userId,
      to: r.profilesTable.id,
      optional: false,
    }),
    versions: r.many.documentVersionsTable({
      from: r.documentsTable.id,
      to: r.documentVersionsTable.documentId,
    }),
  },

  /**
   * A version belongs to *one* document, appears in *many* attachments, and
   * is linked to *many* applications through them (many-to-many).
   */
  documentVersionsTable: {
    document: r.one.documentsTable({
      from: r.documentVersionsTable.documentId,
      to: r.documentsTable.id,
      optional: false,
    }),
    attachments: r.many.applicationDocumentsTable({
      from: r.documentVersionsTable.id,
      to: r.applicationDocumentsTable.documentVersionId,
    }),
    applications: r.many.applicationsTable({
      from: r.documentVersionsTable.id.through(
        r.applicationDocumentsTable.documentVersionId,
      ),
      to: r.applicationsTable.id.through(
        r.applicationDocumentsTable.applicationId,
      ),
    }),
  },

  /**
   * An attachment (join row) links exactly *one* application to exactly
   * *one* document version.
   */
  applicationDocumentsTable: {
    application: r.one.applicationsTable({
      from: r.applicationDocumentsTable.applicationId,
      to: r.applicationsTable.id,
      optional: false,
    }),
    documentVersion: r.one.documentVersionsTable({
      from: r.applicationDocumentsTable.documentVersionId,
      to: r.documentVersionsTable.id,
      optional: false,
    }),
  },
}));
