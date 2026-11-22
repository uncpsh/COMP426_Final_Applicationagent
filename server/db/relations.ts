/**
 * This file defines all of the relations between the tables in our database
 * schema using Drizzle's `defineRelations()` API (Relational Queries v2).
 *
 * Relations do *not* change the structure of the database. They tell Drizzle
 * how tables connect so that the relational query API
 * (`db.query.<table>.findMany(...)`) can load nested data with `with: { ... }`.
 *
 * Empty until step 1.2, which adds the relations from AGENTS.md §4.
 *
 * @see https://orm.drizzle.team/docs/relations-v2
 */

import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, () => ({}));
