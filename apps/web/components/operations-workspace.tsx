"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  LayoutGrid,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Ticket,
  Users,
  Settings,
  Command,
  MapPin,
  PanelLeft,
  Upload,
  Search,
  CheckCircle2,
} from "lucide-react";
import { type Operations, metrics } from "@/lib/ops/types";
type Reply = {
  answer: string;
  tool: string;
  mode: string;
  citations: { title: string; id: string }[];
  draft?: { subject: string; body: string };
};
export function OperationsWorkspace({
  initial: data,
  demo,
}: {
  initial: Operations;
  demo: boolean;
}) {
  const router = useRouter();
  const m = metrics(data);
  const [tab, setTab] = useState("Overview");
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"document" | "draft" | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [nav, setNav] = useState(false);
  const chat = useRef<HTMLDivElement>(null);
  const money = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(v / 100);
  async function ask(message: string) {
    setQuestion(message);
    setBusy(true);
    setStatus("");
    try {
      const r = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: data.event.id, message }),
      });
      const a = await r.json();
      if (!r.ok) throw Error(a.error);
      setReply(a);
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setStatus("");
    try {
      const r = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, eventId: data.event.id }),
      });
      const a = await r.json();
      if (!r.ok) throw Error(a.error);
      setStatus("Saved to your event.");
      setModal(null);
      router.refresh();
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }
  const tabs = [
    { name: "Overview", icon: LayoutGrid },
    { name: "Ticket inventory", icon: Ticket },
    { name: "Waitlist", icon: Users },
    { name: "Knowledge", icon: FileText },
    { name: "Email drafts", icon: Send },
  ];
  const daily = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (13 - i));
    return {
      date: date.toISOString().slice(0, 10),
      value: data.orders
        .filter(
          (o) =>
            o.created_at.slice(0, 10) === date.toISOString().slice(0, 10) &&
            o.status === "paid",
        )
        .reduce((s, o) => s + o.total_cents - o.refunded_cents, 0),
    };
  });
  const max = Math.max(1, ...daily.map((d) => d.value));
  return (
    <div className="ops-app">
      <aside className={`ops-sidebar ${nav ? "is-open" : ""}`}>
        <Link className="ops-brand" href="/operations">
          <span className="ops-logo">
            <Command size={24} />
          </span>
          Gather<span>OS</span>
          <i>®</i>
        </Link>
        <div className="ops-org">
          <span className="ops-org-avatar">F.</span>
          <div>
            {data.event.organization_name || "Event workspace"}
            <small>Organizer workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="ops-label">WORKSPACE</p>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.name}
              className={tab === t.name ? "active" : ""}
              onClick={() => {
                setTab(t.name);
                setNav(false);
              }}
            >
              <t.icon size={17} />
              {t.name}
              {t.name === "Waitlist" && <b>{data.waitlist.length}</b>}
            </button>
          ))}
          <Link href="/dashboard/events">
            <CalendarDays size={17} />
            Manage events
            <ArrowUpRight size={13} />
          </Link>
          <Link href="/dashboard/settings">
            <Settings size={17} />
            Settings
          </Link>
        </nav>
        <div className="ops-sidebar-bottom">
          <div className="ops-tip">
            <Sparkles size={20} />
            <strong>A little clarity. A lot of momentum.</strong>
            <p>Your event data, ready for its next good question.</p>
            <button
              onClick={() =>
                chat.current?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Meet your copilot <ArrowRight size={14} />
            </button>
          </div>
          <div className="ops-user">
            <span>AM</span>
            <div>
              {demo ? "Alex Morgan" : "Your workspace"}
              <small>
                {demo ? "Seeded demo organizer" : "Authenticated organizer"}
              </small>
            </div>
            <span className="ops-online" />
          </div>
        </div>
      </aside>
      <main className="ops-main">
        <header className="ops-topbar">
          <button
            className="ops-mobile-menu"
            aria-label="Open navigation"
            onClick={() => setNav(!nav)}
          >
            <PanelLeft />
          </button>
          <span>
            Workspace <span className="ops-slash">/</span> <b>{tab}</b>
          </span>
          <div>
            <span className="ops-demo-dot" />
            {demo ? "LOCAL DEMO · LIVE DATABASE" : "CONNECTED WORKSPACE"}
          </div>
        </header>
        <div className="ops-content">
          <div className="ops-title-row">
            <div>
              <p className="ops-eyebrow">A GOOD DAY TO BRING PEOPLE TOGETHER</p>
              <h1>{tab === "Overview" ? "Your event, in focus." : tab}</h1>
              <p className="ops-subtitle">
                The big picture. The small details. Everything moving forward.
              </p>
            </div>
            <Link href="/dashboard/events/new" className="ops-button dark">
              <Plus size={16} />
              Create event
            </Link>
          </div>
          <section className="ops-event-strip">
            <div className="ops-event-art">
              <span>F/F</span>
              <small>2026</small>
            </div>
            <div className="ops-event-title">
              <div>
                <h2>{data.event.title}</h2>
                <span className="ops-badge">{data.event.status}</span>
              </div>
              <p>
                <CalendarDays size={13} />
                {new Date(data.event.starts_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
                <span>·</span>
                <MapPin size={13} />
                {data.event.venue_name}, {data.event.city}
              </p>
            </div>
            <Link href={`/events/${data.event.slug}`} className="ops-button">
              Event page <ArrowUpRight size={13} />
            </Link>
            <span className="ops-countdown">
              <b>{m.days}</b> days to go
            </span>
          </section>
          {status && (
            <div className="ops-status" role="status">
              {status}
            </div>
          )}
          {tab === "Overview" && (
            <>
              <section className="ops-stats">
                <article>
                  <span>
                    Net revenue <ArrowUpRight size={15} />
                  </span>
                  <h2>{money(m.revenue)}</h2>
                  <p>Paid orders less recorded refunds</p>
                </article>
                <article>
                  <span>
                    Tickets sold <Ticket size={15} />
                  </span>
                  <h2>
                    {m.sold}
                    <small> / {m.capacity}</small>
                  </h2>
                  <p>
                    <b>{m.sellThrough}%</b> of total capacity
                  </p>
                </article>
                <article>
                  <span>
                    Sales velocity <Activity size={15} />
                  </span>
                  <h2>
                    {m.velocity === null
                      ? "—"
                      : `${m.velocity > 0 ? "+" : ""}${m.velocity}%`}
                  </h2>
                  <p>
                    {m.recent} orders this week · {m.previous} last week
                  </p>
                </article>
                <article>
                  <span>
                    On the waitlist <Users size={15} />
                  </span>
                  <h2>
                    {data.waitlist.length}
                    <small> people</small>
                  </h2>
                  <p>Interested in what comes next</p>
                </article>
              </section>
              <div className="ops-analysis-grid">
                <section className="ops-card ops-chart-card">
                  <div className="ops-card-heading">
                    <div>
                      <h3>Good things are gathering.</h3>
                      <p>Daily ticket revenue · last 14 days</p>
                    </div>
                    <span className="ops-legend">
                      <i />
                      Paid revenue
                    </span>
                  </div>
                  <div
                    className="ops-chart"
                    aria-label="Revenue for the last fourteen days"
                  >
                    {daily.map((d) => (
                      <div
                        className="ops-bar-column"
                        key={d.date}
                        title={`${d.date}: ${money(d.value)}`}
                      >
                        <span className="ops-bar-value">
                          {d.value ? money(d.value) : ""}
                        </span>
                        <div
                          className="ops-bar"
                          style={{
                            height: `${Math.max(2, (d.value / max) * 145)}px`,
                          }}
                        />
                        <small>
                          {new Date(d.date + "T12:00:00Z").toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="ops-chart-footer">
                    <span>
                      <CheckCircle2 size={14} />
                      Calculated from your order ledger
                    </span>
                    <span>No estimates. Just the numbers.</span>
                  </div>
                </section>
                <section className="ops-card ops-health">
                  <div className="ops-card-heading">
                    <h3>Event health</h3>
                    <Activity size={18} />
                  </div>
                  <div className="ops-health-main">
                    <div
                      className="ops-ring"
                      style={{
                        background: `conic-gradient(#b5ce7c ${m.sellThrough}%, #ecede5 0)`,
                      }}
                    >
                      <div>
                        <b>
                          {m.sellThrough}
                          <small>%</small>
                        </b>
                        <span>SOLD</span>
                      </div>
                    </div>
                    <div>
                      <h4>
                        {m.sellThrough >= 65
                          ? "Taking shape."
                          : "Room to grow."}
                      </h4>
                      <p>
                        {m.capacity - m.sold} tickets still
                        <br />
                        have someone’s name on them.
                      </p>
                    </div>
                  </div>
                  <div className="ops-health-line">
                    <span>Check-in progress</span>
                    <b>{m.checkinRate}%</b>
                  </div>
                  <div className="ops-health-line">
                    <span>Orders with refunds</span>
                    <b>{m.refundRate}%</b>
                  </div>
                  <p className="ops-health-note">
                    Sell-through = sold ÷ capacity. Health is a set of
                    measurable signals, never an invented AI score.
                  </p>
                </section>
              </div>
              <section className="ops-inventory-preview">
                <div className="ops-section-heading">
                  <h3>A ticket for every kind of guest.</h3>
                  <button onClick={() => setTab("Ticket inventory")}>
                    Manage inventory <ArrowRight size={14} />
                  </button>
                </div>
                <div className="ops-ticket-grid">
                  {data.inventory.map((t, i) => (
                    <article className="ops-card" key={t.id}>
                      <div className="ops-ticket-top">
                        <span className={`ops-ticket-icon tone-${i}`}>
                          <Ticket size={18} />
                        </span>
                        <span>{money(t.price_cents)}</span>
                      </div>
                      <h4>{t.name}</h4>
                      <p>
                        <b>{t.quantity_sold}</b> sold{" "}
                        <span>
                          {t.quantity - t.quantity_sold - t.quantity_reserved}{" "}
                          available
                        </span>
                      </p>
                      <div className="ops-progress">
                        <i
                          style={{
                            width: `${(t.quantity_sold / t.quantity) * 100}%`,
                          }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
          {tab === "Ticket inventory" && (
            <section className="ops-card ops-table">
              <h3>Inventory with guardrails</h3>
              <p>
                Capacity cannot drop below sold + reserved tickets. Changes
                persist to PostgreSQL.
              </p>
              {data.inventory.map((t) => (
                <form
                  key={t.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    save({
                      action: "inventory",
                      ticketId: t.id,
                      quantity: Number(f.get("quantity")),
                    });
                  }}
                >
                  <div>
                    <strong>{t.name}</strong>
                    <small>
                      {t.quantity_sold} sold · {t.quantity_reserved} reserved ·{" "}
                      {money(t.price_cents)}
                    </small>
                  </div>
                  <label>
                    Capacity{" "}
                    <input
                      aria-label={`${t.name} capacity`}
                      name="quantity"
                      type="number"
                      min={t.quantity_sold + t.quantity_reserved || 1}
                      defaultValue={t.quantity}
                    />
                  </label>
                  <button disabled={busy} className="ops-button">
                    Save capacity
                  </button>
                </form>
              ))}
            </section>
          )}
          {tab === "Waitlist" && (
            <section className="ops-card ops-table">
              <div className="ops-card-heading">
                <h3>{data.waitlist.length} people in the queue</h3>
                <label className="ops-search">
                  <Search size={15} />
                  <input
                    placeholder="Find a person…"
                    aria-label="Search waitlist"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.waitlist
                    .filter((w) =>
                      (w.name + w.email)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((w, i) => (
                      <tr key={w.id}>
                        <td>{i + 1}</td>
                        <td>{w.name}</td>
                        <td>{w.email}</td>
                        <td>
                          <span className="ops-badge">{w.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!data.waitlist.length && <p>No one is waiting yet.</p>}
            </section>
          )}
          {tab === "Knowledge" && (
            <section>
              <div className="ops-section-heading">
                <h3>Your event’s source of truth</h3>
                <button
                  className="ops-button dark"
                  onClick={() => {
                    setSubject("");
                    setBody("");
                    setModal("document");
                  }}
                >
                  <Upload size={15} />
                  Add document
                </button>
              </div>
              <div className="ops-document-grid">
                {data.documents.map((d) => (
                  <article className="ops-card" key={d.id}>
                    <FileText size={24} />
                    <h3>{d.title}</h3>
                    <p>{d.content}</p>
                    <span className="ops-badge">Available to copilot</span>
                  </article>
                ))}
              </div>
            </section>
          )}
          {tab === "Email drafts" && (
            <section>
              <div className="ops-section-heading">
                <h3>Thoughtful words, ready for review.</h3>
                <button
                  className="ops-button dark"
                  onClick={() => {
                    setSubject("");
                    setBody("");
                    setModal("draft");
                  }}
                >
                  <Plus size={15} />
                  New draft
                </button>
              </div>
              <p className="ops-subtitle">
                Drafts are saved, never automatically sent.
              </p>
              <div className="ops-document-grid">
                {data.drafts.map((d) => (
                  <article className="ops-card" key={d.id}>
                    <Send size={22} />
                    <h3>{d.subject}</h3>
                    <p style={{ whiteSpace: "pre-wrap" }}>{d.body}</p>
                    <span className="ops-badge">{d.status}</span>
                  </article>
                ))}
              </div>
              {!data.drafts.length && (
                <div className="ops-card ops-empty">
                  Your next great reminder starts here. Ask the copilot to write
                  a first draft.
                </div>
              )}
            </section>
          )}
          <section className="ops-copilot" ref={chat}>
            <div className="ops-copilot-intro">
              <span className="ops-spark">
                <Sparkles size={24} />
              </span>
              <div>
                <p className="ops-eyebrow">YOUR OPERATIONS COPILOT</p>
                <h3>Less digging. More doing.</h3>
                <p>Ask your event a question. Get an answer with a source.</p>
              </div>
              <span className="ops-ai-mode">
                {demo ? "DETERMINISTIC DEMO" : "EVENT-SCOPED AI"}
              </span>
            </div>
            <div className="ops-prompts">
              {[
                "How many VIP tickets are left?",
                "Where should VIP attendees enter?",
                "Write an event reminder email",
              ].map((q) => (
                <button disabled={busy} key={q} onClick={() => ask(q)}>
                  {q}
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
            {reply && (
              <div className="ops-answer" aria-live="polite">
                <span>
                  <Check size={13} />
                  {reply.tool} · {reply.mode}
                </span>
                <p>{reply.answer}</p>
                {reply.citations.map((c) => (
                  <small key={c.id}>
                    <FileText size={12} /> {c.title}
                  </small>
                ))}
                {reply.draft && (
                  <button
                    className="ops-button"
                    onClick={() => {
                      setSubject(reply.draft!.subject);
                      setBody(reply.draft!.body);
                      setModal("draft");
                    }}
                  >
                    Review & save draft <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}
            <form
              className="ops-chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
            >
              <Sparkles size={18} />
              <input
                aria-label="Ask the copilot"
                value={question}
                maxLength={2000}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know about your event?"
                required
              />
              <button aria-label="Send question" disabled={busy}>
                {busy ? (
                  <Loader2 className="ops-spin" size={18} />
                ) : (
                  <ArrowRight size={19} />
                )}
              </button>
            </form>
            <p className="ops-copilot-foot">
              {demo
                ? "Local mode uses explicit queries and keyword retrieval. Connect OpenAI for model-driven tool calling."
                : "Answers are limited to events you manage. Review generated drafts before use."}
            </p>
          </section>
          <footer className="ops-footer">
            <span>Built for the people behind the gathering.</span>
            <span>
              GatherOS <span>↗</span>
            </span>
          </footer>
        </div>
      </main>
      {modal && (
        <div className="ops-modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="ops-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-title">
              {modal === "document"
                ? "Add event knowledge"
                : "Review your email draft"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(
                  modal === "document"
                    ? { action: "document", title: subject, content: body }
                    : { action: "draft", subject, body },
                );
              }}
            >
              <label>
                {modal === "document" ? "Document title" : "Subject"}
                <input
                  autoFocus
                  required
                  maxLength={modal === "document" ? 120 : 200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              {modal === "document" && (
                <label>
                  Or upload a text / Markdown file
                  <input
                    type="file"
                    accept=".txt,.md"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 100000) {
                          setStatus("File must be under 100 KB");
                          return;
                        }
                        setBody(await f.text());
                        if (!subject) setSubject(f.name);
                      }
                    }}
                  />
                </label>
              )}
              <label>
                {modal === "document" ? "Content" : "Message"}
                <textarea
                  required
                  maxLength={modal === "document" ? 100000 : 10000}
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
              <div>
                <button
                  type="button"
                  className="ops-button"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button disabled={busy} className="ops-button dark">
                  {busy ? "Saving…" : "Save to event"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
