"use client";
import { useRef, useState } from "react";
type Channel = {
  id: string;
  ticketId: string;
  relationshipSide: string;
  createdAt: string;
};
type Message = {
  id: string;
  sequence: number;
  content: string;
  createdAt: string;
};
export function SupportRequesterChannel({
  ticketId,
  initialChannel,
}: {
  ticketId: string;
  initialChannel: Channel | null;
}) {
  const [channel, setChannel] = useState(initialChannel),
    [items, setItems] = useState<Message[]>([]),
    [after, setAfter] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [content, setContent] = useState(""),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState("");
  const key = useRef<string | null>(null);
  async function api(path: string, body?: object) {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error ?? "Requester channel unavailable.");
    return result;
  }
  async function load(c: Channel, cursor: number) {
    const data = await api(
      `/api/support/channels/${c.id}/messages?after=${cursor}`,
    );
    setItems(data.items);
    setHasMore(data.hasMore);
    setAfter(cursor);
    setLoaded(true);
  }
  async function perform(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Requester channel unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Requester-only test channel"
      className="min-w-0 space-y-5"
    >
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
        Requester-only development test messages. This is not live Support: no
        staff audience, replies, delivery or notifications are enabled. Your
        booking counterpart has no access to this ticket or channel.
      </p>
      {!channel ? (
        <button
          disabled={busy}
          className="rounded-xl bg-emerald-700 px-4 py-3 text-white disabled:opacity-50"
          onClick={() =>
            void perform(async () => {
              const data = await api(
                `/api/support/tickets/${ticketId}/channel`,
                {},
              );
              setChannel(data.channel);
              await load(data.channel, 0);
              setFeedback("Your requester-only test channel is ready.");
            })
          }
        >
          Create my requester-only test channel
        </button>
      ) : (
        <>
          <p className="break-all text-xs text-slate-500">
            Own channel reference: {channel.id}
          </p>
          {!loaded ? (
            <button
              disabled={busy}
              className="rounded border px-4 py-2"
              onClick={() => void perform(() => load(channel, 0))}
            >
              Load my test messages
            </button>
          ) : (
            <>
              <ol aria-label="Own test messages" className="divide-y">
                {items.map((message) => (
                  <li key={message.id} className="min-w-0 break-words py-4">
                    <p className="text-xs text-slate-500">
                      Your requester-only test message #{message.sequence} ·{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: "Asia/Taipei",
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(message.createdAt))}{" "}
                      (Asia/Taipei)
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </li>
                ))}
              </ol>
              {!items.length ? (
                <p>No recorded messages on this own-channel page.</p>
              ) : null}
              <nav
                aria-label="Own message pagination"
                className="flex flex-wrap gap-4 text-sm"
              >
                {after > 0 ? (
                  <button
                    className="underline"
                    disabled={busy}
                    onClick={() => void perform(() => load(channel, 0))}
                  >
                    First test messages
                  </button>
                ) : null}
                {hasMore ? (
                  <button
                    className="underline"
                    disabled={busy}
                    onClick={() =>
                      void perform(() => load(channel, items.at(-1)!.sequence))
                    }
                  >
                    Next test messages
                  </button>
                ) : null}
              </nav>
            </>
          )}
          <form
            className="grid min-w-0 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(async () => {
                key.current ??= crypto.randomUUID();
                const data = await api(
                  `/api/support/channels/${channel.id}/messages`,
                  { content, requestKey: key.current },
                );
                setFeedback(
                  `Requester test message #${data.message.sequence} recorded. No staff reply or notification was sent.`,
                );
                setContent("");
                key.current = null;
                await load(channel, after);
              });
            }}
          >
            <label className="grid gap-1">
              Test message
              <textarea
                name="content"
                required
                maxLength={2000}
                rows={4}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  key.current = null;
                }}
                className="min-w-0 rounded-lg border p-3"
              />
            </label>
            <p className="text-xs text-slate-600">
              Synthetic text only. Do not submit credentials, identity
              documents, private evidence, marketplace transcripts or
              coordinates. No attachments or forwarding.
            </p>
            <button
              disabled={busy}
              className="justify-self-start rounded-xl bg-emerald-700 px-4 py-3 text-white disabled:opacity-50"
            >
              {busy ? "Working…" : "Save requester test message"}
            </button>
          </form>
        </>
      )}
      {feedback ? (
        <p role="status" className="text-sm text-emerald-900">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
