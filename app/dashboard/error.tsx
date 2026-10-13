"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="p-8">
      <p>Unable to load your bookings. Please try again.</p>
      <button onClick={reset} className="mt-4 rounded-xl border px-4 py-2">
        Try again
      </button>
    </div>
  );
}
