import Image from "next/image";
import { formatRentalTime } from "@/lib/booking-time";
import { checklistItems } from "@/lib/rental-checklist";

type Photo = { id: string; stage: string };
export function RentalEvidence({
  bookingId,
  evidenceBase,
  title,
  notes,
  checklist,
  photos,
  stage,
  submittedAt,
  actor,
  confirmation,
  serialNumber,
}: {
  bookingId: number;
  evidenceBase?: string;
  title: string;
  notes: string | null;
  checklist: unknown;
  photos: Photo[];
  stage: string;
  submittedAt: Date | null;
  actor: string;
  confirmation?: string;
  serialNumber?: string | null;
}) {
  const entries =
    checklist && typeof checklist === "object" && !Array.isArray(checklist)
      ? Object.entries(checklist)
      : [];
  const stagePhotos = photos.filter((photo) => photo.stage === stage);
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm">
        {submittedAt
          ? `${actor} · ${formatRentalTime(submittedAt)}`
          : "Not submitted yet"}
      </p>
      {confirmation ? (
        <p className="text-sm font-medium">{confirmation}</p>
      ) : null}
      <p className="whitespace-pre-wrap text-sm">
        {notes || "No condition notes recorded."}
      </p>
      {serialNumber ? (
        <p className="text-sm">Serial number: {serialNumber}</p>
      ) : null}
      {entries.length ? (
        <dl className="space-y-2 text-sm">
          {entries.map(([key, value]) => (
            <div key={key} className="flex flex-wrap justify-between gap-2">
              <dt>
                {checklistItems[key as keyof typeof checklistItems] ?? key}
              </dt>
              <dd className="font-medium">
                {typeof value === "boolean"
                  ? value
                    ? "yes"
                    : "no"
                  : typeof value === "string"
                    ? value.replaceAll("_", " ")
                    : "unknown"}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">No checklist recorded.</p>
      )}
      {stagePhotos.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {stagePhotos.map((photo, index) => (
            <a
              key={photo.id}
              href={`${evidenceBase ?? `/api/bookings/${bookingId}/evidence`}/${photo.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Image
                unoptimized
                src={`${evidenceBase ?? `/api/bookings/${bookingId}/evidence`}/${photo.id}`}
                width={640}
                height={480}
                alt={`${title} condition photo ${index + 1}`}
                className="h-auto max-h-80 w-full rounded-lg object-contain"
              />
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No condition photos recorded.</p>
      )}
    </section>
  );
}
