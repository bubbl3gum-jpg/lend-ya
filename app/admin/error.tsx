"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="rounded-xl border bg-white p-6">
      <p>Unable to load administration records. Please try again.</p>
      <button
        className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-white"
        onClick={reset}
      >
        Retry
      </button>
    </div>
  );
}
