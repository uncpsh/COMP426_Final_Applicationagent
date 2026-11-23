/**
 * Seed script (build plan step 8.1): fills ONE demo account with realistic
 * data, so the app has something to show on demo day.
 *
 *   npm run seed                 create (or reset) the demo account
 *   npm run seed -- --dry-run    only print what would be created
 *
 * It needs Node 22.18 or newer, which runs TypeScript files directly.
 *
 * What it creates: a demo user; 8 grad school and 4 internship applications
 * covering every status; 3 recommenders whose letters cover every letter
 * status; an SOP with 4 versions, a CV with 3 and a resume with 2 (small
 * placeholder PDFs), attached to the applications.
 *
 * Every date is counted from the moment the script runs ("in 3 days",
 * "5 days ago"), so the dashboard looks current whenever it is run.
 *
 * SECURITY. This is the only code in the repo that uses the Supabase
 * service-role key, which bypasses every access rule. It runs on a
 * developer's machine, reads the key from `.env.local` (git-ignored) and is
 * never imported by the app. The demo password also comes from `.env.local`:
 * this repository is public, so a password written here would let anyone
 * into the demo account.
 *
 * Running it again is safe: it resets the demo account to this data. It
 * refuses to touch an account that it did not create itself.
 */

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import postgres from "postgres";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

// `.env.local` first, then `.env`; a value that is already set is kept.
dotenv.config({ path: [".env.local", ".env"], quiet: true });

const BUCKET = "documents";
/** Marks, in the account's `app_metadata`, that this script created it. */
const SEED_MARKER = "apptrail_seed";

const isDryRun = process.argv.includes("--dry-run");

/** Stops the script with a message that says what to do. */
function fail(message: string): never {
  console.error(`\nSeed stopped: ${message}\n`);
  process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(
      `${name} is not set. Add it to .env.local (see .env.local.example and the README).`,
    );
  }
  return value;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const now = new Date();

/** The moment `days` days from now (negative: ago), at a local time of day. */
function at(days: number, hour: number, minute: number): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** A deadline: 11:59 PM local time, as most programs use. */
const deadline = (days: number) => at(days, 23, 59);
/** Something the user did during the day, `days` days ago. */
const daysAgo = (days: number, hour = 15) => at(-days, hour, 20);

/* ------------------------------------------------------------------ */
/* The demo data                                                       */
/* ------------------------------------------------------------------ */

type Status =
  | "researching"
  | "preparing"
  | "submitted"
  | "interviewing"
  | "offer"
  | "waitlisted"
  | "rejected"
  | "withdrawn";
type LetterStatus =
  "planned" | "requested" | "confirmed" | "submitted" | "declined";

type SeedApplication = {
  key: string;
  kind: "grad_school" | "internship";
  organization: string;
  position: string;
  term: string;
  status: Status;
  priority?: "reach" | "target" | "safety";
  deadlineAt?: Date;
  submittedAt?: Date;
  portalUrl?: string;
  location?: string;
  feeCents?: number;
  notes?: string;
  createdAt: Date;
};

const APPLICATIONS: SeedApplication[] = [
  // --- Grad school: 8, from "still looking" to "admitted" ---
  {
    key: "cmu",
    kind: "grad_school",
    organization: "Carnegie Mellon University",
    position: "MS in Machine Learning",
    term: "Fall 2027",
    status: "preparing",
    priority: "reach",
    deadlineAt: deadline(3),
    portalUrl: "https://www.cmu.edu",
    feeCents: 10000,
    notes: "SOP limit is two pages. Mention the robotics project.",
    createdAt: daysAgo(62),
  },
  {
    key: "stanford",
    kind: "grad_school",
    organization: "Stanford University",
    position: "MS in Computer Science",
    term: "Fall 2027",
    status: "preparing",
    priority: "reach",
    deadlineAt: deadline(6),
    portalUrl: "https://www.stanford.edu",
    feeCents: 12500,
    createdAt: daysAgo(60),
  },
  {
    key: "utaustin",
    kind: "grad_school",
    organization: "UT Austin",
    position: "MS in Computer Science",
    term: "Fall 2027",
    status: "preparing",
    priority: "target",
    // One day late on purpose: the demo shows what "overdue" looks like.
    deadlineAt: deadline(-1),
    feeCents: 9000,
    notes: "Emailed admissions about a short extension.",
    createdAt: daysAgo(55),
  },
  {
    key: "mit",
    kind: "grad_school",
    organization: "MIT",
    position: "PhD in EECS",
    term: "Fall 2027",
    status: "researching",
    priority: "reach",
    deadlineAt: deadline(14),
    feeCents: 9000,
    notes: "Read recent papers from two labs before deciding.",
    createdAt: daysAgo(30),
  },
  {
    key: "uw",
    kind: "grad_school",
    organization: "University of Washington",
    position: "MS in Computer Science & Engineering",
    term: "Fall 2027",
    status: "submitted",
    priority: "target",
    deadlineAt: deadline(-5),
    submittedAt: daysAgo(6),
    feeCents: 8500,
    createdAt: daysAgo(58),
  },
  {
    key: "gatech",
    kind: "grad_school",
    organization: "Georgia Tech",
    position: "MS in Computer Science",
    term: "Fall 2027",
    status: "interviewing",
    priority: "target",
    deadlineAt: deadline(-21),
    submittedAt: daysAgo(23),
    feeCents: 8500,
    notes: "Faculty interview scheduled for next week.",
    createdAt: daysAgo(70),
  },
  {
    key: "unc",
    kind: "grad_school",
    organization: "UNC Chapel Hill",
    position: "MS in Computer Science",
    term: "Fall 2027",
    status: "offer",
    priority: "safety",
    deadlineAt: deadline(-45),
    submittedAt: daysAgo(47),
    feeCents: 9500,
    notes: "Admitted! Reply by April 15.",
    createdAt: daysAgo(80),
  },
  {
    key: "berkeley",
    kind: "grad_school",
    organization: "UC Berkeley",
    position: "MEng in EECS",
    term: "Fall 2027",
    status: "waitlisted",
    priority: "reach",
    deadlineAt: deadline(-30),
    submittedAt: daysAgo(31),
    feeCents: 13500,
    createdAt: daysAgo(75),
  },

  // --- Internships: 4 ---
  {
    key: "stripe",
    kind: "internship",
    organization: "Stripe",
    position: "Software Engineer Intern",
    term: "Summer 2027",
    status: "submitted",
    deadlineAt: deadline(-8),
    submittedAt: daysAgo(10),
    location: "San Francisco, CA",
    createdAt: daysAgo(40),
  },
  {
    key: "figma",
    kind: "internship",
    organization: "Figma",
    position: "Software Engineer Intern",
    term: "Summer 2027",
    status: "researching",
    // No deadline: applications are reviewed as they come in.
    location: "New York, NY",
    notes: "Rolling applications. Apply once the resume is updated.",
    createdAt: daysAgo(12),
  },
  {
    key: "duolingo",
    kind: "internship",
    organization: "Duolingo",
    position: "Software Engineer Intern",
    term: "Summer 2027",
    status: "rejected",
    deadlineAt: deadline(-35),
    submittedAt: daysAgo(38),
    location: "Pittsburgh, PA",
    createdAt: daysAgo(50),
  },
  {
    key: "twosigma",
    kind: "internship",
    organization: "Two Sigma",
    position: "Quantitative Research Intern",
    term: "Summer 2027",
    status: "withdrawn",
    deadlineAt: deadline(-15),
    location: "New York, NY",
    notes: "Withdrew: the dates overlap with the research program.",
    createdAt: daysAgo(45),
  },
];

type SeedRecommender = {
  key: string;
  name: string;
  email: string;
  title: string;
  organization: string;
  relationship: string;
};

// The addresses use example domains, which can never reach a real person.
const RECOMMENDERS: SeedRecommender[] = [
  {
    key: "rivera",
    name: "Prof. Elena Rivera",
    email: "elena.rivera@example.edu",
    title: "Associate Professor",
    organization: "UNC Computer Science",
    relationship: "Research advisor, 2 years",
  },
  {
    key: "patel",
    name: "Dr. Maya Patel",
    email: "maya.patel@example.edu",
    title: "Teaching Associate Professor",
    organization: "UNC Computer Science",
    relationship: "Instructor for two courses; I was her TA",
  },
  {
    key: "okafor",
    name: "Dr. Amara Okafor",
    email: "amara.okafor@example.com",
    title: "Engineering Manager",
    organization: "Northwind Labs",
    relationship: "Manager during my summer internship",
  },
];

type SeedLetter = {
  application: string;
  recommender: string;
  status: LetterStatus;
  requestedAt?: Date;
  /** Only when the letter has its own date; otherwise the deadline applies. */
  dueAt?: Date;
  submittedAt?: Date;
  notes?: string;
};

const LETTERS: SeedLetter[] = [
  // CMU, due in 3 days: one letter in, two still open.
  {
    application: "cmu",
    recommender: "rivera",
    status: "confirmed",
    requestedAt: daysAgo(14),
  },
  {
    application: "cmu",
    recommender: "patel",
    status: "requested",
    requestedAt: daysAgo(10),
  },
  {
    application: "cmu",
    recommender: "okafor",
    status: "submitted",
    requestedAt: daysAgo(14),
    submittedAt: daysAgo(4),
  },
  // Stanford, due in 6 days.
  {
    application: "stanford",
    recommender: "rivera",
    status: "requested",
    requestedAt: daysAgo(7),
  },
  { application: "stanford", recommender: "patel", status: "planned" },
  // UT Austin, overdue: Rivera's letter is overdue with it.
  {
    application: "utaustin",
    recommender: "rivera",
    status: "requested",
    requestedAt: daysAgo(12),
    notes: "Sent a reminder on Monday.",
  },
  {
    application: "utaustin",
    recommender: "patel",
    status: "submitted",
    requestedAt: daysAgo(12),
    submittedAt: daysAgo(3),
  },
  // MIT, still researching.
  { application: "mit", recommender: "rivera", status: "planned" },
  // UW, submitted: one letter may still arrive after the deadline.
  {
    application: "uw",
    recommender: "rivera",
    status: "submitted",
    requestedAt: daysAgo(25),
    submittedAt: daysAgo(8),
  },
  {
    application: "uw",
    recommender: "patel",
    status: "confirmed",
    requestedAt: daysAgo(25),
    dueAt: deadline(2),
    notes: "UW accepts letters for a week after the deadline.",
  },
  // Earlier applications: everything is in.
  {
    application: "gatech",
    recommender: "rivera",
    status: "submitted",
    requestedAt: daysAgo(40),
    submittedAt: daysAgo(26),
  },
  {
    application: "gatech",
    recommender: "patel",
    status: "submitted",
    requestedAt: daysAgo(40),
    submittedAt: daysAgo(24),
  },
  {
    application: "unc",
    recommender: "rivera",
    status: "submitted",
    requestedAt: daysAgo(65),
    submittedAt: daysAgo(50),
  },
  {
    application: "unc",
    recommender: "patel",
    status: "submitted",
    requestedAt: daysAgo(65),
    submittedAt: daysAgo(49),
  },
  {
    application: "unc",
    recommender: "okafor",
    status: "submitted",
    requestedAt: daysAgo(65),
    submittedAt: daysAgo(48),
  },
  {
    application: "berkeley",
    recommender: "rivera",
    status: "submitted",
    requestedAt: daysAgo(50),
    submittedAt: daysAgo(33),
  },
  {
    application: "berkeley",
    recommender: "okafor",
    status: "declined",
    requestedAt: daysAgo(50),
    notes: "Could not write a second academic letter in time.",
  },
  // An internship reference with its own due date.
  {
    application: "stripe",
    recommender: "okafor",
    status: "requested",
    requestedAt: daysAgo(9),
    dueAt: deadline(4),
    notes: "Reference check by the recruiter.",
  },
];

type SeedDocument = {
  key: string;
  title: string;
  type: "sop" | "cv" | "resume";
  /** Used to build file names, e.g. `sop-ml-focus-v3.pdf`. */
  fileStem: string;
  /** Oldest first. The position in the list is the version number. */
  versions: { uploadedAt: Date; changeNote: string }[];
};

const DOCUMENTS: SeedDocument[] = [
  {
    key: "sop",
    title: "SOP – ML focus",
    type: "sop",
    fileStem: "sop-ml-focus",
    versions: [
      { uploadedAt: daysAgo(52), changeNote: "First full draft" },
      {
        uploadedAt: daysAgo(34),
        changeNote: "Rewrote the intro around the robotics project",
      },
      {
        uploadedAt: daysAgo(14),
        changeNote: "Shortened to two pages, added a research fit paragraph",
      },
      {
        uploadedAt: daysAgo(2),
        changeNote: "Tightened the closing paragraph, fixed typos",
      },
    ],
  },
  {
    key: "cv",
    title: "Academic CV",
    type: "cv",
    fileStem: "academic-cv",
    versions: [
      { uploadedAt: daysAgo(66), changeNote: "Initial version" },
      {
        uploadedAt: daysAgo(36),
        changeNote: "Added the summer internship and TA role",
      },
      { uploadedAt: daysAgo(7), changeNote: "Added the workshop paper" },
    ],
  },
  {
    key: "resume",
    title: "Resume – SWE",
    type: "resume",
    fileStem: "resume-swe",
    versions: [
      {
        uploadedAt: daysAgo(48),
        changeNote: "One-page version for internships",
      },
      { uploadedAt: daysAgo(11), changeNote: "Quantified project results" },
    ],
  },
];

/**
 * Which version of which document went with which application. An
 * application has at most one version of each document.
 */
const ATTACHMENTS: {
  application: string;
  document: string;
  version: number;
}[] = [
  { application: "cmu", document: "sop", version: 4 },
  { application: "cmu", document: "cv", version: 3 },
  // Still on the older SOP: the page offers "Update" to version 4.
  { application: "stanford", document: "sop", version: 3 },
  { application: "stanford", document: "cv", version: 3 },
  { application: "utaustin", document: "sop", version: 4 },
  { application: "utaustin", document: "cv", version: 2 },
  // Sent before the newest versions existed, and it stays that way.
  { application: "uw", document: "sop", version: 3 },
  { application: "uw", document: "cv", version: 2 },
  { application: "gatech", document: "sop", version: 2 },
  { application: "gatech", document: "cv", version: 2 },
  { application: "unc", document: "sop", version: 1 },
  { application: "unc", document: "cv", version: 1 },
  { application: "berkeley", document: "sop", version: 2 },
  { application: "berkeley", document: "cv", version: 2 },
  { application: "stripe", document: "resume", version: 2 },
  { application: "figma", document: "resume", version: 2 },
  { application: "duolingo", document: "resume", version: 1 },
  { application: "twosigma", document: "resume", version: 1 },
];

/* ------------------------------------------------------------------ */
/* Placeholder PDFs                                                    */
/* ------------------------------------------------------------------ */

/**
 * Builds a small, valid one-page PDF that shows the given lines of text.
 * The lines must be plain ASCII, which keeps every character one byte, so
 * the positions in the file's index (the "xref" table) can be counted from
 * the string itself.
 */
function placeholderPdf(lines: string[]): Uint8Array {
  const escapeText = (text: string) => text.replace(/[\\()]/g, "\\$&");
  const content = lines
    .map(
      (line, index) =>
        `BT /F1 ${index === 0 ? 20 : 12} Tf 72 ${720 - index * 28} Td (${escapeText(line)}) Tj ET`,
    )
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

/** Replaces anything outside plain ASCII, such as the dash in a title. */
const toAscii = (text: string) => text.replace(/[^\x20-\x7e]/g, "-");

/* ------------------------------------------------------------------ */
/* Turning the data into rows                                          */
/* ------------------------------------------------------------------ */

/** A value postgres.js can send as a query parameter. */
type Cell = string | number | boolean | Date | null;
type Row = Record<string, Cell>;

type PlannedFile = { path: string; bytes: Uint8Array };

/** Looks a key up in a map, and stops if the seed data refers to nothing. */
function lookUp<T>(map: Map<string, T>, key: string, what: string): T {
  const value = map.get(key);
  if (value === undefined)
    fail(`The seed data refers to an unknown ${what}: "${key}".`);
  return value;
}

/**
 * Builds every row and file for one user. Ids are made here, in the script,
 * so that rows can point at each other before anything is written.
 */
function buildPlan(userId: string) {
  const applicationIds = new Map(
    APPLICATIONS.map((application) => [application.key, randomUUID()]),
  );
  const applicationsByKey = new Map(
    APPLICATIONS.map((application) => [application.key, application]),
  );
  const recommenderIds = new Map(
    RECOMMENDERS.map((recommender) => [recommender.key, randomUUID()]),
  );

  const applications: Row[] = APPLICATIONS.map((application) => ({
    id: lookUp(applicationIds, application.key, "application"),
    user_id: userId,
    kind: application.kind,
    organization: application.organization,
    position: application.position,
    term: application.term,
    status: application.status,
    priority: application.priority ?? null,
    deadline_at: application.deadlineAt ?? null,
    submitted_at: application.submittedAt ?? null,
    portal_url: application.portalUrl ?? null,
    location: application.location ?? null,
    application_fee_cents: application.feeCents ?? null,
    notes: application.notes ?? null,
    created_at: application.createdAt,
    // Last touched when it was submitted, or a couple of days ago.
    updated_at: application.submittedAt ?? daysAgo(2),
  }));

  const recommenders: Row[] = RECOMMENDERS.map((recommender) => ({
    id: lookUp(recommenderIds, recommender.key, "recommender"),
    user_id: userId,
    name: recommender.name,
    email: recommender.email,
    title: recommender.title,
    organization: recommender.organization,
    relationship: recommender.relationship,
    created_at: daysAgo(85),
    updated_at: daysAgo(85),
  }));

  const letters: Row[] = LETTERS.map((letter) => {
    const createdAt = letter.requestedAt ?? daysAgo(5);
    return {
      id: randomUUID(),
      application_id: lookUp(applicationIds, letter.application, "application"),
      recommender_id: lookUp(recommenderIds, letter.recommender, "recommender"),
      status: letter.status,
      requested_at: letter.requestedAt ?? null,
      due_at: letter.dueAt ?? null,
      submitted_at: letter.submittedAt ?? null,
      notes: letter.notes ?? null,
      created_at: createdAt,
      updated_at: letter.submittedAt ?? createdAt,
    };
  });

  const documents: Row[] = [];
  const versions: Row[] = [];
  const files: PlannedFile[] = [];
  /** "sop:3" -> the id of that version. */
  const versionIds = new Map<string, string>();

  for (const document of DOCUMENTS) {
    const documentId = randomUUID();
    const first = document.versions[0];
    const latest = document.versions[document.versions.length - 1];
    if (!first || !latest) fail(`Document "${document.key}" has no versions.`);

    documents.push({
      id: documentId,
      user_id: userId,
      title: document.title,
      type: document.type,
      created_at: first.uploadedAt,
      updated_at: latest.uploadedAt,
    });

    document.versions.forEach((version, index) => {
      const versionNumber = index + 1;
      const versionId = randomUUID();
      const fileName = `${document.fileStem}-v${versionNumber}.pdf`;
      // The same layout the app uses: {userId}/{documentId}/{uuid}-{name}.
      const path = `${userId}/${documentId}/${randomUUID()}-${fileName}`;
      const bytes = placeholderPdf([
        toAscii(document.title),
        `Version ${versionNumber}`,
        toAscii(version.changeNote),
        "Placeholder file created by the AppTrail seed script.",
      ]);

      versionIds.set(`${document.key}:${versionNumber}`, versionId);
      files.push({ path, bytes });
      versions.push({
        id: versionId,
        document_id: documentId,
        version_number: versionNumber,
        storage_path: path,
        file_name: fileName,
        file_size_bytes: bytes.byteLength,
        change_note: version.changeNote,
        created_at: version.uploadedAt,
      });
    });
  }

  const attachments: Row[] = ATTACHMENTS.map((attachment) => {
    const application = lookUp(
      applicationsByKey,
      attachment.application,
      "application",
    );
    return {
      application_id: lookUp(
        applicationIds,
        attachment.application,
        "application",
      ),
      document_version_id: lookUp(
        versionIds,
        `${attachment.document}:${attachment.version}`,
        "document version",
      ),
      // Attached the day before it was sent, or a few days ago if not sent.
      attached_at: application.submittedAt
        ? new Date(application.submittedAt.getTime() - 24 * 60 * 60 * 1000)
        : daysAgo(1),
    };
  });

  return {
    applications,
    recommenders,
    letters,
    documents,
    versions,
    attachments,
    files,
  };
}

type Plan = ReturnType<typeof buildPlan>;

function printPlan(plan: Plan) {
  const count = (rows: Row[], column: string) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = String(row[column]);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts].map(([value, total]) => `${value} ${total}`).join(", ");
  };

  console.log(
    `  applications   ${plan.applications.length}  (${count(plan.applications, "kind")})`,
  );
  console.log(`    by status    ${count(plan.applications, "status")}`);
  console.log(`  recommenders   ${plan.recommenders.length}`);
  console.log(
    `  letters        ${plan.letters.length}  (${count(plan.letters, "status")})`,
  );
  console.log(
    `  documents      ${plan.documents.length}  with ${plan.versions.length} versions (PDF files)`,
  );
  console.log(`  attachments    ${plan.attachments.length}`);
}

/* ------------------------------------------------------------------ */
/* Writing: the demo account, the files, the rows                      */
/* ------------------------------------------------------------------ */

type Sql = ReturnType<typeof postgres>;

/**
 * Returns the id of the demo account, creating it if needed. An existing
 * account is used only if this script created it; any other account with
 * that email is left alone and the script stops.
 */
async function findOrCreateDemoUser(
  sql: Sql,
  supabase: SupabaseClient,
  account: { email: string; password: string; displayName: string },
): Promise<{ id: string; isNew: boolean }> {
  const existing = await sql<{ id: string; seeded: boolean }[]>`
    select id, coalesce((raw_app_meta_data ->> ${SEED_MARKER})::boolean, false) as seeded
    from auth.users
    where lower(email) = lower(${account.email})`;

  const [user] = existing;
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      // No confirmation email: the demo account must work right away.
      email_confirm: true,
      // The profile trigger reads the display name from here.
      user_metadata: { display_name: account.displayName },
      app_metadata: { [SEED_MARKER]: true },
    });
    if (error || !data.user) {
      fail(
        `Could not create the demo account: ${error?.message ?? "no user returned"}`,
      );
    }
    return { id: data.user.id, isNew: true };
  }

  if (!user.seeded) {
    fail(
      "An account with the SEED_USER_EMAIL address already exists and was not created by this script. " +
        "The seed would replace all of its data, so it will not touch it. Use a different address.",
    );
  }

  // Keep the account, but make the password and name match `.env.local`.
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: account.password,
    user_metadata: { display_name: account.displayName },
  });
  if (error) fail(`Could not update the demo account: ${error.message}`);
  await sql`update public.profiles set display_name = ${account.displayName} where id = ${user.id}`;

  return { id: user.id, isNew: false };
}

/** Lists the path of every file one user has in the bucket. */
async function listUserFiles(supabase: SupabaseClient, userId: string) {
  const bucket = supabase.storage.from(BUCKET);
  const paths: string[] = [];

  // Files live at {userId}/{documentId}/{file}: list the document folders,
  // then the files in each one.
  const { data: folders, error } = await bucket.list(userId, { limit: 1000 });
  if (error) fail(`Could not list the demo account's files: ${error.message}`);

  for (const folder of folders) {
    const prefix = `${userId}/${folder.name}`;
    const { data: files, error: listError } = await bucket.list(prefix, {
      limit: 1000,
    });
    if (listError) fail(`Could not list ${prefix}: ${listError.message}`);
    paths.push(...files.map((file) => `${prefix}/${file.name}`));
  }

  return paths;
}

async function removeFiles(supabase: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  // Leftover files are untidy but harmless: nothing points at them.
  if (error) console.warn(`Could not remove some files: ${error.message}`);
}

async function uploadFiles(supabase: SupabaseClient, files: PlannedFile[]) {
  for (const file of files) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(file.path, file.bytes, { contentType: "application/pdf" });
    if (error) fail(`Could not upload ${file.path}: ${error.message}`);
  }
}

/** Writes all rows in one transaction: either everything is there or nothing. */
async function insertRows(sql: Sql, userId: string, plan: Plan) {
  await sql.begin(async (transaction) => {
    // Start from an empty account. The letters, versions and attachments
    // go with their parents (`on delete cascade`).
    await transaction`delete from public.applications where user_id = ${userId}`;
    await transaction`delete from public.recommenders where user_id = ${userId}`;
    await transaction`delete from public.documents where user_id = ${userId}`;

    // Parents first, then the rows that point at them.
    await transaction`insert into public.applications ${transaction(plan.applications)}`;
    await transaction`insert into public.recommenders ${transaction(plan.recommenders)}`;
    await transaction`insert into public.recommendation_requests ${transaction(plan.letters)}`;
    await transaction`insert into public.documents ${transaction(plan.documents)}`;
    await transaction`insert into public.document_versions ${transaction(plan.versions)}`;
    await transaction`insert into public.application_documents ${transaction(plan.attachments)}`;
  });
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  if (isDryRun) {
    console.log("Dry run. Nothing is written. The seed would create:\n");
    printPlan(buildPlan(randomUUID()));
    console.log("\nDeadlines around today:");
    const byDeadline = [...APPLICATIONS].sort(
      (a, b) => (a.deadlineAt?.getTime() ?? 0) - (b.deadlineAt?.getTime() ?? 0),
    );
    for (const application of byDeadline) {
      const days = application.deadlineAt
        ? Math.round(
            (application.deadlineAt.getTime() - now.getTime()) / 86_400_000,
          )
        : null;
      if (days !== null && days >= -2 && days <= 14) {
        console.log(
          `  ${application.deadlineAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}  ${application.organization} (${application.status})`,
        );
      }
    }
    return;
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const databaseUrl = requireEnv("DATABASE_URL");
  const account = {
    email: requireEnv("SEED_USER_EMAIL"),
    password: requireEnv("SEED_USER_PASSWORD"),
    displayName: process.env.SEED_USER_NAME?.trim() || "Alex Chen",
  };

  if (serviceRoleKey.startsWith("sb_publishable_")) {
    fail(
      "SUPABASE_SERVICE_ROLE_KEY holds the publishable key. The seed needs the secret (service role) key from Supabase > Project Settings > API Keys.",
    );
  }
  if (account.password.length < 8) {
    fail("SEED_USER_PASSWORD must be at least 8 characters, like any sign-up.");
  }

  // The service-role client: no session is stored, nothing is refreshed.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // The pooler in transaction mode does not support prepared statements.
  const sql = postgres(databaseUrl, { prepare: false, max: 1 });

  try {
    const user = await findOrCreateDemoUser(sql, supabase, account);
    console.log(
      user.isNew
        ? "Created the demo account."
        : "Found the demo account from an earlier run. Resetting it.",
    );

    const plan = buildPlan(user.id);
    const newFiles = plan.files.map((file) => file.path);

    // Order matters. The old rows and old files stay untouched until the
    // new rows are safely in, so a failure half-way leaves the account as
    // it was instead of with rows that point at missing files.
    const oldFiles = await listUserFiles(supabase, user.id);
    await uploadFiles(supabase, plan.files);
    try {
      await insertRows(sql, user.id, plan);
    } catch (error) {
      // The transaction was rolled back, so the files just uploaded belong
      // to nothing. Remove them, then report the real problem.
      await removeFiles(supabase, newFiles);
      throw error;
    }
    await removeFiles(supabase, oldFiles);

    console.log("\nSeeded:\n");
    printPlan(plan);
    console.log(
      "\nDone. Log in with SEED_USER_EMAIL and SEED_USER_PASSWORD from .env.local.",
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "\nSeed failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
