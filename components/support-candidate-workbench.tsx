"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { enrollPasskey, verifyPasskey } from "@/lib/webauthn-browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
type Ticket = {
  id: string;
  categoryCode: string;
  currentState: string;
  createdAt: string;
};
type Message = {
  id: string;
  sequence: number;
  authorKind: "REQUESTER" | "SUPPORT_TEST";
  content: string;
  createdAt: string;
};
type Event = { eventType: string; sequence: number; createdAt: string };
const button =
  "rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";
const input =
  "mt-1 block w-full min-w-0 rounded-lg border border-slate-400 p-2 focus-visible:outline-2 focus-visible:outline-emerald-700";
const time = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date)) + " (Asia/Taipei)";
export function SupportCandidateWorkbench({
  kind,
  companionAvailable = false,
}: {
  kind: "staff" | "requester";
  companionAvailable?: boolean;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]),
    [ticket, setTicket] = useState<Ticket | null>(null),
    [channels, setChannels] = useState<{ id: string }[]>([]),
    [channel, setChannel] = useState<string | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [events, setEvents] = useState<Event[]>([]),
    [after, setAfter] = useState(0),
    [more, setMore] = useState(false),
    [content, setContent] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState("");
  const retry = useRef<string | null>(null);
  async function command<T>(body: object): Promise<T> {
    const r = await fetch(
      `/api/dev/support-${kind === "staff" ? "agent" : "requester"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const data = await r.json();
    if (!r.ok) throw Error(data.error ?? "Scoped access unavailable");
    return data;
  }
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await work();
    } catch (e) {
      setTickets([]);
      setTicket(null);
      setChannels([]);
      setChannel(null);
      setMessages([]);
      setEvents([]);
      setError(e instanceof Error ? e.message : "Scoped access unavailable");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  async function queue() {
    setTicket(null);
    setChannels([]);
    setChannel(null);
    setMessages([]);
    setEvents([]);
    setTickets(
      await command<Ticket[]>({
        action: kind === "staff" ? "queue" : "tickets",
      }),
    );
  }
  async function select(t: Ticket) {
    setChannel(null);
    setMessages([]);
    setEvents([]);
    retry.current = null;
    setContent("");
    const metadata = await command<Ticket>({
      action: "ticket",
      ticketId: t.id,
    });
    const list = await command<{ id: string }[] | { id: string }>({
      action: kind === "staff" ? "channels" : "channel",
      ticketId: t.id,
    });
    const history =
      kind === "staff"
        ? await command<Event[]>({ action: "events", ticketId: t.id })
        : [];
    setTicket(metadata);
    setChannels(Array.isArray(list) ? list : [list]);
    setEvents(history);
  }
  async function load(cid: string, cursor = 0) {
    if (!ticket) throw Error("Select a ticket");
    const rows = await command<Message[]>({
      action: "read",
      ticketId: ticket.id,
      channelId: cid,
      after: cursor,
    });
    setChannel(cid);
    setMessages(rows.slice(0, 10));
    setMore(rows.length > 10);
    setAfter(cursor);
  }
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">
          Hustlen’ ·{" "}
          {kind === "staff"
            ? "Support Agent workbench candidate"
            : "Private Support requester candidate"}
        </h1>
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          Owned synthetic development acceptance only. No real staff activation,
          live Support, notifications, attachments, recovery or ticket closure.
          Staff access requires exact assignment, channel permission and
          committed audit. Passkey verification alone is not staff
          authorization.
        </p>
        {companionAvailable && <Link href="/dev/support-companion">Open offline Support companion (no model)</Link>}
      </header>
      {kind === "staff" ? (
        <section
          aria-labelledby="passkey-title"
          className="space-y-4 rounded-xl border bg-white p-5"
        >
          <h2 id="passkey-title" className="text-xl font-semibold">
            Real passkey · synthetic identity
          </h2>
          <label className="block max-w-sm">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              disabled={busy || !password}
              onClick={() =>
                void run(async () => {
                  const c = await command<{
                    challengeId: string;
                    options: PublicKeyCredentialCreationOptionsJSON;
                  }>({ action: "enroll.begin", password });
                  const response = await enrollPasskey(
                    c.options,
                    new AbortController().signal,
                  );
                  await command({
                    action: "enroll.finish",
                    password,
                    challengeId: c.challengeId,
                    response,
                  });
                  setFeedback(
                    "Fixture passkey enrolled. Verify with a fresh assertion.",
                  );
                })
              }
            >
              Enroll fixture passkey
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const c = await command<{
                    challengeId: string;
                    options: PublicKeyCredentialRequestOptionsJSON;
                  }>({ action: "verify.begin" });
                  const response = await verifyPasskey(
                    c.options,
                    new AbortController().signal,
                  );
                  const proof = await command<{
                    factorVerified: boolean;
                    staffAuthorized: false;
                  }>({
                    action: "verify.finish",
                    challengeId: c.challengeId,
                    response,
                  });
                  if (!proof.factorVerified || proof.staffAuthorized !== false)
                    throw Error("Real verification required");
                  setFeedback(
                    "Real passkey verified for this session. Every access still checks synthetic assignment and channel permissions.",
                  );
                })
              }
            >
              Verify fixture passkey
            </button>
          </div>
          <p className="text-sm text-slate-600">
            No recovery or mandatory production MFA. Real human verification and
            production staff cutover remain unapproved.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-xl font-semibold">Create my test ticket</h2>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const body = {
                action: "create",
                categoryCode: data.get("categoryCode"),
                subject: data.get("subject"),
                description: data.get("description"),
                requestKey: crypto.randomUUID(),
                ...(data.get("bookingId")
                  ? { bookingId: Number(data.get("bookingId")) }
                  : {}),
              };
              void run(async () => {
                const created = await command<Ticket>(body);
                await queue();
                await select(created);
                setFeedback(
                  "Own test ticket and own channel created. No opposite-party channel was created.",
                );
              });
            }}
          >
            <label>
              Category
              <select name="categoryCode" className={input}>
                <option value="RENTAL_HANDOFF_RETURN">
                  Rental / handoff / return
                </option>
                <option value="ACCOUNT_HELP">Account help</option>
                <option value="OTHER_SUPPORT">Other Support</option>
              </select>
            </label>
            <label>
              Own booking ID (optional)
              <input name="bookingId" type="number" min="1" className={input} />
            </label>
            <label className="md:col-span-2">
              Test subject
              <input
                name="subject"
                required
                maxLength={120}
                className={input}
              />
            </label>
            <label className="md:col-span-2">
              Test description
              <textarea
                name="description"
                required
                maxLength={2000}
                className={input}
              />
            </label>
            <button disabled={busy} className={button}>
              Create own test ticket
            </button>
          </form>
        </section>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="min-w-0 space-y-4 rounded-xl border bg-white p-5">
          <h2 className="text-xl font-semibold">
            {kind === "staff" ? "Assigned tickets" : "My tickets"}
          </h2>
          <button
            className={button}
            disabled={busy}
            onClick={() => void run(queue)}
          >
            {kind === "staff" ? "Load assigned tickets" : "Load my tickets"}
          </button>
          <p className="text-sm text-slate-600">
            At most 20 permitted candidate tickets. No message previews or
            foreign counts.
          </p>
          {!tickets.length ? (
            <p>
              No tickets loaded. Access may require a current passkey
              verification and exact assignment.
            </p>
          ) : (
            <ul className="space-y-4">
              {tickets.map((t) => (
                <li key={t.id} className="min-w-0 border-t pt-3">
                  <p>
                    {t.categoryCode} · {t.currentState}
                  </p>
                  <p className="text-xs text-slate-600">{time(t.createdAt)}</p>
                  <p className="break-all text-xs text-slate-600">
                    Own permitted reference: {t.id}
                  </p>
                  <button
                    className="mt-2 underline"
                    disabled={busy}
                    onClick={() => void run(() => select(t))}
                  >
                    Open {kind === "staff" ? "assigned" : "my"} ticket
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className="min-w-0 space-y-4 rounded-xl border bg-white p-5"
          aria-label="Exact ticket investigation"
        >
          {ticket ? (
            <>
              <h2 className="text-xl font-semibold">Permitted ticket detail</h2>
              <p>
                {ticket.categoryCode} · {ticket.currentState}
              </p>
              <p className="break-all text-xs text-slate-600">
                {ticket.id} · {time(ticket.createdAt)}
              </p>
              <nav
                aria-label="Explicit permitted channel selection"
                className="flex flex-wrap gap-3"
              >
                {channels.map((c) => (
                  <button
                    key={c.id}
                    className={button}
                    disabled={busy}
                    onClick={() => void run(() => load(c.id))}
                  >
                    Open permitted channel
                  </button>
                ))}
              </nav>
              {!channels.length ? (
                <p>
                  No channel read grant is available. Assignment alone grants no
                  transcript access.
                </p>
              ) : null}
              {channel ? (
                <>
                  <h3 className="text-lg font-semibold">
                    Private permitted transcript
                  </h3>
                  <p className="text-sm">
                    Only this channel is selected. No external delivery or read
                    receipts.
                  </p>
                  <ol className="divide-y" aria-label="Permitted messages">
                    {messages.map((m) => (
                      <li key={m.id} className="break-words py-4">
                        <p className="text-xs text-slate-600">
                          #{m.sequence} ·{" "}
                          {m.authorKind === "SUPPORT_TEST"
                            ? "Synthetic Support reply"
                            : "Requester message"}{" "}
                          · {time(m.createdAt)}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap">{m.content}</p>
                      </li>
                    ))}
                  </ol>
                  {!messages.length ? (
                    <p>No messages recorded on this page.</p>
                  ) : null}
                  <div className="flex flex-wrap gap-4">
                    <button
                      className="underline"
                      disabled={busy}
                      onClick={() => void run(() => load(channel))}
                    >
                      Refresh first messages
                    </button>
                    {after > 0 ? (
                      <button
                        className="underline"
                        disabled={busy}
                        onClick={() => void run(() => load(channel, 0))}
                      >
                        First messages
                      </button>
                    ) : null}
                    {more ? (
                      <button
                        className="underline"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            load(channel, messages.at(-1)!.sequence),
                          )
                        }
                      >
                        Next messages
                      </button>
                    ) : null}
                  </div>
                  <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        retry.current ??= crypto.randomUUID();
                        await command({
                          action: kind === "staff" ? "reply" : "message",
                          ticketId: ticket.id,
                          channelId: channel,
                          content,
                          requestKey: retry.current,
                        });
                        setContent("");
                        retry.current = null;
                        await load(channel, after);
                        setFeedback(
                          "Test message committed in this channel. No notification or ticket transition was sent.",
                        );
                      });
                    }}
                  >
                    <label>
                      {kind === "staff"
                        ? "Test Support reply"
                        : "My test message"}
                      <textarea
                        name="content"
                        rows={4}
                        required
                        maxLength={2000}
                        className={input}
                        value={content}
                        onChange={(e) => {
                          setContent(e.target.value);
                          retry.current = null;
                        }}
                      />
                    </label>
                    <p className="text-xs text-slate-600">
                      Synthetic text only. No credentials, private evidence,
                      transcripts or coordinates. No attachments or forwarding.
                    </p>
                    <button className={button} disabled={busy}>
                      Save {kind === "staff" ? "test reply" : "my test message"}
                    </button>
                  </form>
                </>
              ) : null}
              {kind === "staff" ? (
                <section className="space-y-2 border-t pt-4">
                  <h3 className="text-lg font-semibold">
                    Read-only ticket history
                  </h3>
                  <ul>
                    {events.map((event) => (
                      <li key={event.sequence}>
                        {event.eventType} · {time(event.createdAt)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-slate-600">
                    No custody, evidence, dispute, sanction or approval
                    controls.
                  </p>
                </section>
              ) : null}
            </>
          ) : (
            <p>Select an exact permitted ticket to investigate.</p>
          )}
        </section>
      </div>
      {feedback ? (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-emerald-900"
        >
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">
          {error} Assignment may be unavailable, revoked or expired. No new
          private result was disclosed.
        </p>
      ) : null}
    </main>
  );
}
