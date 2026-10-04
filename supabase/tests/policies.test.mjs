// Verifies supabase/schema.sql in an in-memory Postgres (PGlite) with a stub of
// Supabase auth. Runs the schema twice (it must be idempotent), then checks every
// row-level security rule as customers, barbers, salon owners, anonymous
// visitors and the server.
//
//   node supabase/tests/policies.test.mjs          fresh database
//   node supabase/tests/policies.test.mjs legacy   database created before schema.sql
//
// Run both with: npm run test:db

import { PGlite } from "@electric-sql/pglite";
import fs from "fs";

const MODE = process.argv[2] === "legacy" ? "legacy" : "fresh";
const db = new PGlite();
const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

// Minimal stand-in for Supabase's auth schema and API roles.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`);

if (MODE === "legacy") await db.exec(read("./legacy-fixture.sql"));
await db.exec(read("../schema.sql"));
await db.exec(read("../schema.sql"));
await db.exec(`
  grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
`);

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const OWNER = "00000000-0000-0000-0000-0000000000c1";
const BARBER2 = "00000000-0000-0000-0000-0000000000d2";
const S1 = "10000000-0000-0000-0000-000000000001";
const S2 = "10000000-0000-0000-0000-000000000002";

// Rows that satisfy both the fresh and the legacy column layout.
const RESERVED = MODE === "legacy" ? "'[]'::jsonb" : "'{}'::text[]";
const bk = (id, userId, barberId, time, { salonId = null, total = 25, paid = false } = {}) =>
  `insert into bookings (id, user_id, barber_id, barber_name, service_id, service_name, duration_min,
     date, time, reserved_time, demand, base_price_euro, service_price_euro, tip_euro, total_euro,
     payment_method, user_email, status, stripe_paid, salon_id)
   values ('${id}', '${userId}', '${barberId}', 'Barber', 'cut', 'Cut', 30, '2026-10-10', '${time}',
     ${RESERVED}, 'normal', ${total}, ${total}, 0, ${total}, 'salon', 'c@x.de', 'pending', ${paid},
     ${salonId ? `'${salonId}'` : "null"})`;
const svc = (id, barberId, price = 25) =>
  `insert into services (id, barber_id, name, category, duration_min, base_price_euro, active)
   values ('${id}', '${barberId}', 'Cut', 'Hair', 30, ${price}, true)`;
const barber = (id, salonId) =>
  `insert into barbers (id, name, area, address, dist_km, rating, reviews, active, salon_id)
   values ('${id}', 'Barber', 'Area', 'Address', 0, 5, 0, true, '${salonId}')`;

// Seed as the database owner, like the dashboard or service role would.
await db.exec(`
  insert into auth.users values ('${A}', 'a@x.de'), ('${B}', 'b@x.de'), ('${OWNER}', 'owner@x.de'),
    ('${BARBER2}', 'b2@x.de');
  insert into salons (id, name, email) values ('${S1}', 'Salon One', 'one@x.de'), ('${S2}', 'Salon Two', 'two@x.de');
  ${barber("b1", S1)}; ${barber("b2", S2)};
  update profiles set role = 'salon', salon_id = '${S1}' where id = '${OWNER}';
  update profiles set role = 'barber', barber_id = 'b2' where id = '${BARBER2}';
  insert into applications (type, status, email) values ('salon', 'pending', 'x@y.de');
`);

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? "  — " + detail : ""}`);
}
async function q(sql) {
  try {
    return { rows: (await db.query(sql)).rows };
  } catch (error) {
    return { error: error.message, rows: [] };
  }
}
async function as(role, sub, fn) {
  await db.exec(`reset role;
    select set_config('request.jwt.claim.sub', '${sub ?? ""}', false),
           set_config('request.jwt.claim.role', '${role}', false);
    set role ${role};`);
  try {
    await fn();
  } finally {
    await db.exec("reset role;");
  }
}
const one = async (sql) => (await db.query(sql)).rows[0];

check(
  "new users get a customer profile automatically",
  (await one(`select count(*)::int n from profiles where role = 'customer'`)).n === 2
);
check(
  "dashboard edits to roles are kept",
  (await one(`select role from profiles where id = '${OWNER}'`)).role === "salon"
);

await as("authenticated", A, async () => {
  const r = await q(bk("k1", A, "b1", "10:00", { salonId: S1, total: 40 }));
  check("customer can create own booking", !r.error, r.error);
  check(
    "customer cannot create pre-paid booking",
    !!(await q(bk("k2", A, "b1", "11:00", { paid: true }))).error
  );
  check("customer cannot book for someone else", !!(await q(bk("k3", B, "b1", "12:00"))).error);

  await q(
    `update bookings set stripe_paid = true, total_euro = 0.5, status = 'cancelled' where id = 'k1'`
  );
  const k1 = await one(
    `select stripe_paid, total_euro::float t, status from bookings where id = 'k1'`
  );
  check(
    "customer cannot mark booking paid or change price",
    k1.stripe_paid === false && k1.t === 40,
    JSON.stringify(k1)
  );
  check("customer can cancel own booking", k1.status === "cancelled");

  await q(`update profiles set role = 'salon', salon_id = '${S2}' where id = '${A}'`);
  const p = await one(`select role, salon_id from profiles where id = '${A}'`);
  check(
    "customer cannot promote own role",
    p.role === "customer" && p.salon_id === null,
    JSON.stringify(p)
  );

  const up = await q(
    `insert into profiles (id, email, role) values ('${A}', 'a@x.de', 'customer')
     on conflict (id) do update set email = excluded.email`
  );
  check("signup profile upsert works", !up.error, up.error);
  check(
    "customer cannot edit a salon",
    (await q(`update salons set name = 'x' where id = '${S1}' returning id`)).rows.length === 0
  );
  check(
    "customer cannot read applications",
    (await q(`select * from applications`)).rows.length === 0
  );
});

await as("authenticated", B, async () => {
  check(
    "other customers cannot see the booking",
    (await q(`select * from bookings`)).rows.length === 0
  );
  check(
    "other customers cannot read profiles",
    (await q(`select * from profiles where id = '${A}'`)).rows.length === 0
  );
});

await db.exec(`update bookings set status = 'pending' where id = 'k1'`);

await as("anon", null, async () => {
  const slots = await q(`select * from booking_slots where barber_id = 'b1'`);
  check("visitors can read booked slots", !slots.error && slots.rows.length === 1, slots.error);
  check(
    "slot view has no customer data",
    slots.rows[0] && !("user_email" in slots.rows[0]) && !("user_id" in slots.rows[0])
  );
  check("visitors cannot read bookings", (await q(`select * from bookings`)).rows.length === 0);
  check("visitors cannot read profiles", (await q(`select * from profiles`)).rows.length === 0);
  const pub = await one(
    `select (select count(*) from salons)::int s, (select count(*) from barbers)::int b`
  );
  check("salons and barbers are public", pub.s === 2 && pub.b === 2);
  check("visitors cannot create bookings", !!(await q(bk("k9", A, "b1", "13:00"))).error);
});

await as("authenticated", OWNER, async () => {
  check(
    "salon owner can edit own salon",
    (await q(`update salons set name = 'Renamed' where id = '${S1}' returning id`)).rows.length ===
      1
  );
  check(
    "salon owner cannot edit another salon",
    (await q(`update salons set name = 'x' where id = '${S2}' returning id`)).rows.length === 0
  );
  const s1 = await q(svc("cut_b1", "b1"));
  check("salon owner can add service for own barber", !s1.error, s1.error);
  check(
    "salon owner cannot add service for another salon's barber",
    !!(await q(svc("cut_b2", "b2"))).error
  );
  check(
    "salon owner sees own salon's bookings",
    (await q(`select id from bookings`)).rows.length === 1
  );
  const nb = await q(barber("b3", S1));
  check("salon owner can add barber to own salon", !nb.error, nb.error);
  check("salon owner cannot add barber to another salon", !!(await q(barber("b4", S2))).error);
});

await db.exec(bk("k5", B, "b2", "10:00", { salonId: S2 }));

await as("authenticated", BARBER2, async () => {
  const rows = (await q(`select id from bookings`)).rows;
  check(
    "barber sees only own bookings",
    rows.length === 1 && rows[0].id === "k5",
    JSON.stringify(rows)
  );
  check(
    "barber can confirm own booking",
    (await q(`update bookings set status = 'confirmed' where id = 'k5' returning id`)).rows
      .length === 1
  );
  check(
    "barber cannot change another barber's booking",
    (await q(`update bookings set status = 'completed' where id = 'k1' returning id`)).rows
      .length === 0
  );
  const sv = await q(svc("fade_b2", "b2"));
  check("barber can add own service", !sv.error, sv.error);
  check("barber cannot add service for another barber", !!(await q(svc("fade_b1", "b1"))).error);
});

await as("service_role", null, async () => {
  await q(`update bookings set stripe_paid = true where id = 'k1'`);
  check(
    "server can mark booking paid",
    (await one(`select stripe_paid from bookings where id = 'k1'`)).stripe_paid === true
  );
  check("server can read applications", (await q(`select * from applications`)).rows.length === 1);
});

// Inserts the app's server routes make without explicit ids or timestamps.
const sal = await q(
  `insert into salons (name, email) values ('Approved Salon', 's@x.de') returning id`
);
check("salon insert without id works", !sal.error, sal.error);
const app = await q(
  `insert into applications (type, status, email) values ('barber', 'pending', 'n@x.de') returning id`
);
check("application insert without id works", !app.error, app.error);
const half = await q(svc("half_b1", "b1", 22.5));
check("service insert without timestamps works", !half.error, half.error);
check(
  "service prices keep cents",
  (await one(`select base_price_euro::float p from services where id = 'half_b1'`)).p === 22.5
);
const wh = await q(
  `insert into barber_working_hours (barber_id, day_of_week, start_time, end_time) values ('b1', 1, '09:00', '18:00')
   on conflict (barber_id, day_of_week) do update set end_time = excluded.end_time`
);
check("working hours upsert works", !wh.error, wh.error);

if (MODE === "legacy") {
  check(
    "old permissive policies were removed",
    (await one(`select count(*)::int n from pg_policies where policyname = 'allow all'`)).n === 0
  );
  const locked = await one(
    `select bool_and(relrowsecurity) ok from pg_class
     where relname in ('barber_avability', 'salon_settings', 'service_barbers')`
  );
  check("unused legacy tables are locked", locked.ok === true);
}

console.log(`\n[${MODE}] ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
