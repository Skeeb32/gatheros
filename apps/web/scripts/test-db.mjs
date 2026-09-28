import pg from "pg";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const root = new URL("../../../packages/database/", import.meta.url);
const base = process.env.TEST_DATABASE_URL;
if (!base)
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated PostgreSQL admin connection (the runner creates and drops its own test database).",
  );
const database = `gather_test_${Date.now()}`;
const admin = new pg.Client({ connectionString: base });
await admin.connect();
await admin.query(`create database ${database}`);
const url = new URL(base);
url.pathname = `/${database}`;
const pool = new pg.Pool({ connectionString: url.toString(), max: 12 });
let passed = 0;
const q = (sql, args = []) => pool.query(sql, args);
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function as(role, user, sql, args = []) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${role}`);
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user || "",
    ]);
    const result = await c.query(sql, args);
    await c.query("commit");
    return result;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
const ownerA = "00000000-0000-4000-8000-000000000001",
  ownerB = "00000000-0000-4000-8000-000000000002",
  buyer = "00000000-0000-4000-8000-000000000003",
  staff = "00000000-0000-4000-8000-000000000004";
const eventA = "20000000-0000-4000-8000-000000000001",
  eventB = "20000000-0000-4000-8000-000000000002",
  typeA = "30000000-0000-4000-8000-000000000001";
const reserve = (
  key = randomUUID(),
  quantity = 1,
  email = "buyer@example.com",
) =>
  as(
    "service_role",
    null,
    "select * from public.reserve_order($1,$2,$3,$4,$5,$6,$7,1000)",
    [typeA, quantity, email, "Test", "Buyer", buyer, key],
  );
const finalize = (o, id = "evt_paid", amount = 4400) =>
  as(
    "service_role",
    null,
    "select public.finalize_order($1,$2,'checkout.session.completed','cs_test','pi_test',$3,'usd')",
    [o, id, amount],
  );
try {
  await q(await readFile(new URL("tests/bootstrap.sql", root), "utf8"));
  for (const file of (await readdir(new URL("migrations/", root))).sort())
    await q(await readFile(new URL(`migrations/${file}`, root), "utf8"));
  await q(await readFile(new URL("tests/fixtures.sql", root), "utf8"));
  await test("anonymous sees only published events", async () =>
    assert.equal(
      (await as("anon", null, "select * from public.events")).rowCount,
      1,
    ));
  await test("owner sees own draft, not another tenant draft", async () =>
    assert.deepEqual(
      (
        await as(
          "authenticated",
          ownerA,
          "select title from public.events order by title",
        )
      ).rows.map((r) => r.title),
      ["A draft", "A public"],
    ));
  await test("profile access is self-only", async () =>
    assert.equal(
      (await as("authenticated", ownerA, "select * from public.profiles"))
        .rowCount,
      1,
    ));
  await test("member rows are tenant scoped", async () =>
    assert.equal(
      (
        await as(
          "authenticated",
          ownerA,
          "select * from public.organizer_members",
        )
      ).rowCount,
      2,
    ));
  await test("Stripe account columns are not public", async () =>
    assert.rejects(
      as("anon", null, "select stripe_account_id from public.organizers"),
      /permission denied/,
    ));
  await test("public organizer profile is readable", async () =>
    assert.equal(
      (await as("anon", null, "select name from public.organizers")).rowCount,
      2,
    ));
  await test("staff cannot edit events", async () =>
    assert.equal(
      (
        await as(
          "authenticated",
          staff,
          "update public.events set title='hacked' where id=$1",
          [eventA],
        )
      ).rowCount,
      0,
    ));
  await test("owner cannot edit another tenant event", async () =>
    assert.equal(
      (
        await as(
          "authenticated",
          ownerA,
          "update public.events set title='hacked' where id=$1",
          [eventB],
        )
      ).rowCount,
      0,
    ));
  await test("event cannot be reassigned to another organizer", async () =>
    assert.rejects(
      as(
        "authenticated",
        ownerA,
        "update public.events set organizer_id='10000000-0000-4000-8000-000000000002' where id=$1",
        [eventA],
      ),
      /permission denied/,
    ));
  await test("sold inventory is not writable from browser", async () =>
    assert.rejects(
      as(
        "authenticated",
        ownerA,
        "update public.ticket_types set quantity_sold=1 where id=$1",
        [typeA],
      ),
      /permission denied/,
    ));
  await test("staff cannot escalate membership", async () =>
    assert.rejects(
      as(
        "authenticated",
        staff,
        "insert into public.organizer_members(organizer_id,user_id,role) values('10000000-0000-4000-8000-000000000002',$1,'owner')",
        [staff],
      ),
      /row-level security/,
    ));
  await test("server functions are inaccessible to buyers", async () =>
    assert.rejects(
      as(
        "authenticated",
        buyer,
        "select public.finalize_order(gen_random_uuid(),'x','x',null,null,0,'usd')",
      ),
      /permission denied/,
    ));
  await test("anonymous cannot insert orders", async () =>
    assert.rejects(
      as(
        "anon",
        null,
        "insert into public.orders(event_id,buyer_email,subtotal_cents,total_cents,request_key) values($1,'x@example.com',0,0,gen_random_uuid())",
        [eventA],
      ),
      /permission denied/,
    ));
  await test("storage hides draft-event images", async () =>
    assert.equal(
      (await as("anon", null, "select * from storage.objects")).rowCount,
      1,
    ));
  await test("storage denies cross-tenant uploads", async () =>
    assert.rejects(
      as(
        "authenticated",
        ownerA,
        "insert into storage.objects(bucket_id,name) values('event-images',$1)",
        [`${eventB}/bad.png`],
      ),
      /row-level security/,
    ));
  await test("closed draft cannot sell tickets", async () =>
    assert.rejects(
      as(
        "service_role",
        null,
        "select public.reserve_order('30000000-0000-4000-8000-000000000002',1,'a@b.com','A','B',null,gen_random_uuid(),1000)",
      ),
      /sales_closed/,
    ));
  let order;
  const key = randomUUID();
  await test("server derives price and reserves capacity", async () => {
    order = (await reserve(key)).rows[0];
    assert.equal(order.total_cents, 4400);
    assert.equal(
      (
        await q(
          "select quantity_reserved from public.ticket_types where id=$1",
          [typeA],
        )
      ).rows[0].quantity_reserved,
      1,
    );
  });
  await test("same checkout request is idempotent", async () => {
    assert.equal((await reserve(key)).rows[0].id, order.id);
    assert.equal(
      (await q("select count(*)::int n from public.orders")).rows[0].n,
      1,
    );
  });
  await test("idempotency key cannot be reused for another buyer", async () =>
    assert.rejects(
      reserve(key, 1, "other@example.com"),
      /idempotency_conflict/,
    ));
  await test("owner of other tenant cannot read buyer data", async () =>
    assert.equal(
      (await as("authenticated", ownerB, "select * from public.orders"))
        .rowCount,
      0,
    ));
  await test("staff cannot read bulk customer orders", async () =>
    assert.equal(
      (await as("authenticated", staff, "select * from public.orders"))
        .rowCount,
      0,
    ));
  await test("buyer sees own order", async () =>
    assert.equal(
      (await as("authenticated", buyer, "select * from public.orders"))
        .rowCount,
      1,
    ));
  await test("underpayment rolls back without consuming webhook ID", async () => {
    await assert.rejects(
      finalize(order.id, "evt_underpay", 1),
      /payment_mismatch/,
    );
    assert.equal(
      (
        await q(
          "select count(*)::int n from public.stripe_webhook_events where id='evt_underpay'",
        )
      ).rows[0].n,
      0,
    );
  });
  await test("concurrent duplicate webhooks issue exactly one ticket", async () => {
    await Promise.all([
      finalize(order.id),
      finalize(order.id),
      finalize(order.id, "evt_other"),
    ]);
    assert.equal(
      (await q("select count(*)::int n from public.tickets")).rows[0].n,
      1,
    );
    assert.equal(
      (await q("select count(*)::int n from public.payment_transactions"))
        .rows[0].n,
      1,
    );
    assert.equal(
      (
        await q("select quantity_sold from public.ticket_types where id=$1", [
          typeA,
        ])
      ).rows[0].quantity_sold,
      1,
    );
  });
  await test("attendees and tickets are hidden across tenants", async () => {
    assert.equal(
      (await as("authenticated", ownerB, "select * from public.tickets"))
        .rowCount,
      0,
    );
    assert.equal(
      (await as("authenticated", ownerB, "select * from public.attendees"))
        .rowCount,
      0,
    );
    assert.equal(
      (await as("authenticated", buyer, "select * from public.tickets"))
        .rowCount,
      1,
    );
  });
  const ticket = (await q("select * from public.tickets")).rows[0];
  await test("ticket codes are long random values", async () =>
    assert.match(ticket.ticket_code, /^[a-f0-9]{64}$/));
  await test("unrelated staff cannot scan event", async () =>
    assert.rejects(
      as("authenticated", ownerB, "select public.check_in_ticket($1,$2)", [
        ticket.ticket_code,
        eventA,
      ]),
      /forbidden/,
    ));
  await test("two scanners admit one guest exactly once", async () => {
    const scans = await Promise.all([
      as(
        "authenticated",
        staff,
        "select public.check_in_ticket($1,$2) result",
        [ticket.ticket_code, eventA],
      ),
      as(
        "authenticated",
        ownerA,
        "select public.check_in_ticket($1,$2) result",
        [ticket.ticket_code, eventA],
      ),
    ]);
    assert.equal(scans.filter((s) => s.rows[0].result.success).length, 1);
    assert.equal(
      scans.filter((s) => s.rows[0].result.reason === "already_checked_in")
        .length,
      1,
    );
    assert.equal(
      (await q("select count(*)::int n from public.check_ins")).rows[0].n,
      1,
    );
  });
  let reserved;
  await test("parallel purchases cannot oversell remaining seats", async () => {
    const attempts = await Promise.allSettled([
      reserve(randomUUID(), 2),
      reserve(randomUUID(), 2),
    ]);
    assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1);
    reserved = attempts.find((a) => a.status === "fulfilled").value.rows[0];
    const t = (
      await q("select * from public.ticket_types where id=$1", [typeA])
    ).rows[0];
    assert.equal(t.quantity_sold + t.quantity_reserved, 3);
  });
  await test("expiration releases exactly once", async () => {
    await Promise.all([
      as(
        "service_role",
        null,
        "select public.release_order($1,'evt_expired','checkout.session.expired','cs_expired')",
        [reserved.id],
      ),
      as(
        "service_role",
        null,
        "select public.release_order($1,'evt_expired','checkout.session.expired','cs_expired')",
        [reserved.id],
      ),
    ]);
    assert.equal(
      (
        await q(
          "select quantity_reserved from public.ticket_types where id=$1",
          [typeA],
        )
      ).rows[0].quantity_reserved,
      0,
    );
  });
  await test("late paid event cannot resurrect a released order", async () =>
    assert.rejects(
      finalize(reserved.id, "evt_late", 8800),
      /order_not_pending/,
    ));
  await test("partial refunds are monotonic and keep admissions", async () => {
    await as(
      "service_role",
      null,
      "select public.refund_order('pi_test','evt_partial',1000)",
    );
    await as(
      "service_role",
      null,
      "select public.refund_order('pi_test','evt_older',500)",
    );
    assert.equal(
      (
        await q("select refunded_cents from public.orders where id=$1", [
          order.id,
        ])
      ).rows[0].refunded_cents,
      1000,
    );
    assert.equal(
      (await q("select status from public.tickets")).rows[0].status,
      "used",
    );
  });
  await test("full refunds revoke tickets", async () => {
    await as(
      "service_role",
      null,
      "select public.refund_order('pi_test','evt_refund',4400)",
    );
    assert.equal(
      (await q("select status from public.tickets")).rows[0].status,
      "refunded",
    );
  });
  await test("replayed paid event cannot unrefund an order", async () => {
    await finalize(order.id, "evt_replayed");
    assert.equal(
      (await q("select status from public.orders where id=$1", [order.id]))
        .rows[0].status,
      "refunded",
    );
  });
  await test("owner can create and update an event through column grants", async () => {
    const r = await as(
      "authenticated",
      ownerA,
      "insert into public.events(organizer_id,title,slug,starts_at) values('10000000-0000-4000-8000-000000000001','New event','new-event',now()+interval '40 days') returning id",
    );
    assert.equal(
      (
        await as(
          "authenticated",
          ownerA,
          "update public.events set title='Updated event' where id=$1 returning id",
          [r.rows[0].id],
        )
      ).rowCount,
      1,
    );
  });
  await test("owner can create and edit ticket types without inventory privileges", async () => {
    const r = await as(
      "authenticated",
      ownerA,
      "insert into public.ticket_types(event_id,name,price_cents,quantity) values($1,'VIP',7500,20) returning id",
      [eventA],
    );
    assert.equal(
      (
        await as(
          "authenticated",
          ownerA,
          "update public.ticket_types set price_cents=8000 where id=$1 returning id",
          [r.rows[0].id],
        )
      ).rowCount,
      1,
    );
  });
  await test("owner can update staff role but cannot replace the owner", async () => {
    assert.equal(
      (
        await as(
          "authenticated",
          ownerA,
          "update public.organizer_members set role='manager' where user_id=$1 returning user_id",
          [staff],
        )
      ).rowCount,
      1,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          ownerA,
          "update public.organizer_members set role='staff' where user_id=$1 returning user_id",
          [ownerA],
        )
      ).rowCount,
      0,
    );
  });
  await test("self-owned organizer creation atomically adds owner membership", async () => {
    const r = await as(
      "authenticated",
      buyer,
      "insert into public.organizers(owner_user_id,name,slug) values($1,'Buyer host','buyer-host') returning id",
      [buyer],
    );
    assert.equal(
      (
        await as(
          "authenticated",
          buyer,
          "select role from public.organizer_members where organizer_id=$1",
          [r.rows[0].id],
        )
      ).rows[0].role,
      "owner",
    );
  });
  await test("sales windows are enforced by the database", async () => {
    await q(
      "update public.ticket_types set sales_start=now()+interval '1 day' where id=$1",
      [typeA],
    );
    await assert.rejects(reserve(), /sales_closed/);
    await q(
      "update public.ticket_types set sales_start=null,sales_end=now()-interval '1 day' where id=$1",
      [typeA],
    );
    await assert.rejects(reserve(), /sales_closed/);
    await q("update public.ticket_types set sales_end=null where id=$1", [
      typeA,
    ]);
  });
  await test("historical order pricing survives ticket price changes", async () => {
    await q("update public.ticket_types set price_cents=5000 where id=$1", [
      typeA,
    ]);
    assert.equal(
      (
        await q(
          "select unit_price_cents from public.order_items where order_id=$1",
          [order.id],
        )
      ).rows[0].unit_price_cents,
      4000,
    );
  });

  await q("update public.organizer_members set role='staff' where user_id=$1", [
    staff,
  ]);
  await test("operations RPC denies cross-tenant access", async () => {
    await assert.rejects(
      () =>
        as("authenticated", ownerB, "select public.event_operations($1)", [
          eventA,
        ]),
      /forbidden/,
    );
  });
  await test("operations RPC denies event staff finance access", async () => {
    await assert.rejects(
      () =>
        as("authenticated", staff, "select public.event_operations($1)", [
          eventA,
        ]),
      /forbidden/,
    );
  });
  await test("organizer gets own operations snapshot", async () => {
    const row = (
      await as(
        "authenticated",
        ownerA,
        "select public.event_operations($1) as data",
        [eventA],
      )
    ).rows[0];
    assert.equal(row.data.event.id, eventA);
  });
  await test("document insertion chunks content transactionally", async () => {
    const doc = (
      await as(
        "authenticated",
        ownerA,
        "insert into public.event_documents(event_id,title,content) values($1,'Guide',$2) returning id",
        [eventA, "VIP north entrance. ".repeat(100)],
      )
    ).rows[0];
    assert.ok(
      (
        await as(
          "authenticated",
          ownerA,
          "select * from public.document_chunks where document_id=$1",
          [doc.id],
        )
      ).rowCount > 1,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          ownerB,
          "select * from public.document_chunks where document_id=$1",
          [doc.id],
        )
      ).rowCount,
      0,
    );
  });
  await test("cross-tenant document injection is rejected", async () => {
    await assert.rejects(() =>
      as(
        "authenticated",
        ownerB,
        "insert into public.event_documents(event_id,title,content) values($1,'Attack','not allowed')",
        [eventA],
      ),
    );
  });
  await test("email drafts cannot be marked sent by browser", async () => {
    await assert.rejects(() =>
      as(
        "authenticated",
        ownerA,
        "insert into public.notifications(event_id,kind,subject,body,status) values($1,'reminder','Hello','World','sent')",
        [eventA],
      ),
    );
  });
  await test("waitlist join is idempotent and private", async () => {
    const a = await as(
      "service_role",
      null,
      "select public.join_waitlist($1,'join@example.com','Guest') as id",
      [eventA],
    );
    const b = await as(
      "service_role",
      null,
      "select public.join_waitlist($1,'JOIN@example.com','Guest') as id",
      [eventA],
    );
    assert.equal(a.rows[0].id, b.rows[0].id);
    assert.equal(
      (
        await as(
          "authenticated",
          ownerB,
          "select * from public.waitlist_entries where event_id=$1",
          [eventA],
        )
      ).rowCount,
      0,
    );
  });
  await test("staff cannot add event staff", async () => {
    await assert.rejects(() =>
      as(
        "authenticated",
        staff,
        "insert into public.event_staff(event_id,user_id) values($1,$2)",
        [eventA, buyer],
      ),
    );
  });

  await test("rate limits persist across requests", async () => {
    const first = await as(
      "service_role",
      null,
      "select public.consume_rate_limit('test',1) as ok",
    );
    const second = await as(
      "service_role",
      null,
      "select public.consume_rate_limit('test',1) as ok",
    );
    assert.equal(first.rows[0].ok, true);
    assert.equal(second.rows[0].ok, false);
    await assert.rejects(() =>
      as(
        "authenticated",
        ownerA,
        "select public.consume_rate_limit('bypass',999)",
      ),
    );
  });
  await test("event-specific staff can scan but cannot see finances", async () => {
    await as(
      "authenticated",
      ownerA,
      "insert into public.event_staff(event_id,user_id) values($1,$2)",
      [eventA, buyer],
    );
    const scan = await as(
      "authenticated",
      buyer,
      "select public.check_in_ticket('missing',$1) as data",
      [eventA],
    );
    assert.equal(scan.rows[0].data.reason, "ticket_not_found");
    await assert.rejects(
      () =>
        as("authenticated", buyer, "select public.event_operations($1)", [
          eventA,
        ]),
      /forbidden/,
    );
  });
  console.log(`\n${passed} PostgreSQL integration tests passed.`);
} finally {
  await pool.end();
  // pg-pool may resolve end() before the server observes every socket close.
  // Do not FORCE-terminate closing clients: that can emit an unhandled idle error.
  for (let attempt = 0; ; attempt++) {
    try {
      await admin.query(`drop database ${database}`);
      break;
    } catch (error) {
      if (error.code !== "55006" || attempt >= 9) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  await admin.end();
}
