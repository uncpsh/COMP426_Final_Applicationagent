/**
 * This file exports a `db` object, which serves as the primary reference to the
 * database and the Drizzle ORM.
 *
 * The `relations` object (see `relations.ts`) is passed to Drizzle so that the
 * relational query API (`db.query.<table>`) knows how our tables connect.
 *
 * @author Ajay Gandecha <agandecha@unc.edu>
 * @license MIT
 * @see https://comp426-25f.github.io/
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { relations } from "@/server/db/relations";

const connectionString = process.env.DATABASE_URL;

// `prepare: false` is required when connecting through Supabase's
// transaction pooler, which does not support prepared statements.
export const client = postgres(connectionString!, { prepare: false });
export const db = drizzle({ client, relations });
