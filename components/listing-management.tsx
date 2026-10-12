"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
export function ListingManagement({ id, title }: { id: number; title: string }) {
 const dialog = useRef<HTMLDialogElement>(null);
 const router = useRouter();
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 async function remove() {
  setBusy(true); setError("");
  try { const response = await fetch(`/api/listings/${id}`, { method: "DELETE" });
   const data = await response.json(); if (!response.ok) throw new Error(data.error);
   dialog.current?.close(); router.refresh();
  } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete listing."); }
  finally { setBusy(false); }
 }
 return <div className="mt-3 flex flex-wrap gap-3 text-sm">
  <Link href={`/listings/${id}`} className="text-emerald-700 underline">View details</Link>
  <Link href={`/listings/${id}/edit`} className="underline">Edit listing</Link>
  <button onClick={() => dialog.current?.showModal()} className="text-rose-700 underline">Delete listing</button>
  <dialog ref={dialog} onCancel={(event) => { if (busy) event.preventDefault(); }} className="m-auto max-w-md rounded-2xl p-6 backdrop:bg-black/40" aria-labelledby={`delete-${id}`}>
   <h2 id={`delete-${id}`} className="text-xl font-semibold">Delete {title}?</h2>
   <p className="my-4">This permanently deletes the listing. Listings with booking history must be deactivated instead.</p>
   {error && <p role="alert" className="text-rose-700">{error}</p>}
   <div className="mt-4 flex gap-4"><button disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button disabled={busy} onClick={remove} className="rounded-lg bg-rose-700 p-2 text-white">{busy ? "Deleting…" : "Confirm delete"}</button></div>
  </dialog>
 </div>;
}
