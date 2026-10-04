// Verifies supabase/schema.sql: runs it twice in an in-memory Postgres (PGlite)
// with a stub of Supabase auth, then checks every row-level security rule.
// Run with: npm run test:db

import { PGlite } from "@electric-sql/pglite";
import fs from "fs";

const db = new PGlite();
const schema = fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8");

// Minimal stand-in for Supabase's auth schema and roles.
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`);
await db.exec(schema);
await db.exec(schema); // idempotency
await db.exec(`
  grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
`);

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const OWNER = "00000000-0000-0000-0000-0000000000c1";
const BARBER2 = "00000000-0000-0000-0000-0000000000d2";

// Seed as superuser (like the service role would).
await db.exec(`
  insert into auth.users values ('${A}','a@x.de'),('${B}','b@x.de'),('${OWNER}','owner@x.de'),('${BARBER2}','b2@x.de');
  insert into salons (id,name) values ('s1','Salon One'),('s2','Salon Two');
  insert into barbers (id,name,salon_id) values ('b1','Barber One','s1'),('b2','Barber Two','s2');
  update profiles set role='salon', salon_id='s1' where id='${OWNER}';
  update profiles set role='barber', barber_id='b2' where id='${BARBER2}';
  insert into applications (type,email) values ('salon','x@y.de');
`);

async function as(role, sub, fn) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${sub ?? ""}',false), set_config('request.jwt.claim.role','${role}',false); set role ${role};`
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
let pass = 0,
  fail = 0;
function check(name, ok, detail = "") {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
async function tryQ(q) {
  try {
    return { rows: (await db.query(q)).rows, affected: (await db.query("select 1")).rows && null };
  } catch (e) {
    return { error: e.message };
  }
}

check(
  "trigger created customer profiles",
  (await db.query(`select count(*)::int n from profiles where role='customer'`)).rows[0].n === 2
);

await as("authenticated", A, async () => {
  const r = await tryQ(
    `insert into bookings (id,user_id,barber_id,date,time,salon_id,total_euro) values ('k1','${A}','b1','2026-10-10','10:00','s1',40)`
  );
  check("customer can create own booking", !r.error, r.error);
  const r2 = await tryQ(
    `insert into bookings (id,user_id,barber_id,date,time,stripe_paid) values ('k2','${A}','b1','2026-10-10','11:00',true)`
  );
  check("customer cannot create pre-paid booking", !!r2.error);
  const r3 = await tryQ(
    `insert into bookings (id,user_id,barber_id,date,time) values ('k3','${B}','b1','2026-10-10','12:00')`
  );
  check("customer cannot create booking for someone else", !!r3.error);
  await tryQ(
    `update bookings set stripe_paid=true, total_euro=0.5, status='cancelled' where id='k1'`
  );
  const k1 = (
    await db.query(`select stripe_paid, total_euro::float t, status from bookings where id='k1'`)
  ).rows[0];
  check(
    "customer cannot mark booking paid or change price",
    k1.stripe_paid === false && k1.t === 40,
    JSON.stringify(k1)
  );
  check("customer can still cancel own booking", k1.status === "cancelled");
  await tryQ(`update profiles set role='salon', salon_id='s2' where id='${A}'`);
  const p = (await db.query(`select role, salon_id from profiles where id='${A}'`)).rows[0];
  check(
    "customer cannot promote own role",
    p.role === "customer" && p.salon_id === null,
    JSON.stringify(p)
  );
  const up = await tryQ(
    `insert into profiles (id,email,role) values ('${A}','a@x.de','customer') on conflict (id) do update set email=excluded.email`
  );
  check("signup profile upsert still works", !up.error, up.error);
  const r4 = await tryQ(`update salons set name='hacked' where id='s1' returning id`);
  check("customer cannot edit a salon", !r4.error && r4.rows.length === 0);
  const apps = await tryQ(`select * from applications`);
  check("customer cannot read applications", !apps.error && apps.rows.length === 0);
});

await as("authenticated", B, async () => {
  const r = await tryQ(`select * from bookings`);
  check("other customer cannot see the booking", !r.error && r.rows.length === 0);
});

await db.exec(`update bookings set status='pending' where id='k1'`);
await as("anon", null, async () => {
  const slots = await tryQ(`select * from booking_slots where barber_id='b1'`);
  check(
    "anonymous visitors can read booked slots",
    !slots.error && slots.rows.length === 1,
    slots.error
  );
  check(
    "slot view exposes no customer data",
    slots.rows[0] && !("user_email" in slots.rows[0]) && !("user_id" in slots.rows[0])
  );
  const b = await tryQ(`select * from bookings`);
  check("anonymous visitors cannot read bookings", !b.error && b.rows.length === 0);
  const pub = await tryQ(
    `select (select count(*) from salons)::int s, (select count(*) from barbers)::int b`
  );
  check("salons and barbers are public", pub.rows[0].s === 2 && pub.rows[0].b === 2);
  const ins = await tryQ(
    `insert into bookings (id,barber_id,date,time) values ('k9','b1','2026-10-10','13:00')`
  );
  check("anonymous visitors cannot create bookings", !!ins.error);
});

await as("authenticated", OWNER, async () => {
  const r = await tryQ(`update salons set name='Salon One Renamed' where id='s1' returning id`);
  check("salon owner can edit own salon", r.rows?.length === 1, r.error);
  const r2 = await tryQ(`update salons set name='x' where id='s2' returning id`);
  check("salon owner cannot edit another salon", r2.rows?.length === 0);
  const s1 = await tryQ(
    `insert into services (id,barber_id,name,base_price_euro) values ('cut_b1','b1','Cut',25)`
  );
  check("salon owner can add service for own barber", !s1.error, s1.error);
  const s2 = await tryQ(`insert into services (id,barber_id,name) values ('cut_b2','b2','Cut')`);
  check("salon owner cannot add service for other salon's barber", !!s2.error);
  const bk = await tryQ(`select id from bookings`);
  check("salon owner sees own salon's bookings", bk.rows?.length === 1);
  const team = await tryQ(`select id from profiles`);
  check("salon owner reads own profile", team.rows?.length >= 1, team.error);
  const nb = await tryQ(`insert into barbers (id,name,salon_id) values ('b3','New','s1')`);
  check("salon owner can add barber to own salon", !nb.error, nb.error);
  const nb2 = await tryQ(`insert into barbers (id,name,salon_id) values ('b4','New','s2')`);
  check("salon owner cannot add barber to other salon", !!nb2.error);
});

await db.exec(
  `insert into bookings (id,user_id,barber_id,date,time,salon_id) values ('k5','${B}','b2','2026-10-11','10:00','s2')`
);
await as("authenticated", BARBER2, async () => {
  const bk = await tryQ(`select id from bookings`);
  check(
    "barber sees only own bookings",
    bk.rows?.length === 1 && bk.rows[0].id === "k5",
    JSON.stringify(bk.rows)
  );
  const u = await tryQ(`update bookings set status='confirmed' where id='k5' returning id`);
  check("barber can confirm own booking", u.rows?.length === 1, u.error);
  const u2 = await tryQ(`update bookings set status='completed' where id='k1' returning id`);
  check("barber cannot touch another barber's booking", u2.rows?.length === 0);
  const sv = await tryQ(`insert into services (id,barber_id,name) values ('fade_b2','b2','Fade')`);
  check("barber can add own service", !sv.error, sv.error);
  const sv2 = await tryQ(`insert into services (id,barber_id,name) values ('fade_b1','b1','Fade')`);
  check("barber cannot add service for another barber", !!sv2.error);
});

await as("service_role", null, async () => {
  await tryQ(`update bookings set stripe_paid=true where id='k1'`);
  const k = (await db.query(`select stripe_paid from bookings where id='k1'`)).rows[0];
  check("server (service role) can mark booking paid", k.stripe_paid === true);
  const a = await tryQ(`select * from applications`);
  check("server can read applications", a.rows?.length === 1);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
