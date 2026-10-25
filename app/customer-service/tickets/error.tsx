"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="p-8">
      <h1>Development ticket service unavailable</h1>
      <p role="alert">
        No status conclusion could be loaded. Your existing help and rental
        support remain available.
      </p>
      <button className="m-4 underline" onClick={reset}>
        Try again
      </button>
      <a className="underline" href="/customer-service">
        Help guidance
      </a>
    </main>
  );
}
