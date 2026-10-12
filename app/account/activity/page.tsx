import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export default async function ActivityPage() {
 const user = await getCurrentUser(); if (!user) return null;
 const bookings = await prisma.booking.findMany({ where: { OR: [{ ownerId: user.id }, { renterId: user.id }] }, include: { listing: { select: { title: true } }, handoff: true, return: true, dispute: true }, orderBy: { updatedAt: "desc" } });
 const events = bookings.flatMap(b => [{ at: b.createdAt, label: "Booking requested", id: b.id, title: b.listing.title }, ...(b.handoff ? [{ at: b.handoff.timestamp, label: "Handoff submitted", id: b.id, title: b.listing.title }] : []), ...(b.handoff?.confirmedAt ? [{ at: b.handoff.confirmedAt, label: "Handoff confirmed", id: b.id, title: b.listing.title }] : []), ...(b.return ? [{ at: b.return.timestamp, label: "Return submitted", id: b.id, title: b.listing.title }] : []), ...(b.return?.confirmedAt ? [{ at: b.return.confirmedAt, label: "Return inspected and confirmed", id: b.id, title: b.listing.title }] : []), ...(b.dispute ? [{ at: b.dispute.createdAt, label: "Concern opened", id: b.id, title: b.listing.title }] : []), ...(b.dispute?.resolvedAt ? [{ at: b.dispute.resolvedAt, label: "Concern resolved", id: b.id, title: b.listing.title }] : [])]).sort((a,b) => b.at.getTime() - a.at.getTime());
 return <div><h1 className="mb-6 text-3xl font-semibold">Activity logs</h1>{!events.length && <p>No transaction activity yet.</p>}<ul className="space-y-3">{events.map((event,i) => <li key={i} className="rounded-xl border p-4"><Link href={`/bookings/${event.id}`} className="font-medium underline">{event.title}</Link><p>{event.label} · {event.at.toISOString().replace("T", " ").slice(0,16)} UTC</p></li>)}</ul></div>;
}
