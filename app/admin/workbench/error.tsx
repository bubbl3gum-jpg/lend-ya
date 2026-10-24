"use client";
export default function WorkbenchError({ retry }: { retry: () => void }) {
  return (
    <section role="alert" className="rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Operations queues unavailable</h2>
      <p className="my-3 text-sm">
        No queue data could be loaded. Refresh to check again.
      </p>
      <button
        type="button"
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white"
        onClick={() => retry()}
      >
        Try again
      </button>
    </section>
  );
}
