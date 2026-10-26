import { requireAdminPage } from "@/lib/admin/auth";
import { settingsInventory } from "@/lib/admin/settings";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireAdminPage();
  const rows = await settingsInventory();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          System
        </p>
        <h1 className="text-3xl font-semibold">Platform Settings</h1>
        <p className="mt-2 text-slate-600">
          Read-only operational inventory · trusted code, database policy and
          validated environment configuration.
        </p>
      </header>
      <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        No setting can be edited here. No secrets, account allowlists,
        credentials or private infrastructure addresses are displayed.
        Configured development gates do not imply current authorization.
      </aside>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {rows.map((r) => (
          <article
            key={r.id}
            className="min-w-0 space-y-2 rounded-xl border bg-white p-5"
          >
            <h2 className="text-lg font-semibold">{r.label}</h2>
            <p className="break-words font-medium">{r.value}</p>
            <dl className="space-y-2 text-sm text-slate-600">
              <dt className="font-semibold">Authoritative source</dt>
              <dd className="break-words">{r.source}</dd>
              <dt className="font-semibold">Type / impact</dt>
              <dd>
                {r.type} · {r.impact}
              </dd>
              <dt className="font-semibold">
                Future change classification (proposed)
              </dt>
              <dd>{r.future}</dd>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
