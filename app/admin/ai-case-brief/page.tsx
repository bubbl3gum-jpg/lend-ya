import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { syntheticBriefEnabled } from "@/lib/ai-case-brief/config";
import { readLocale } from "@/lib/i18n/server";
import { readAppearance } from "@/lib/heritage/appearance";
import { SyntheticCaseBrief } from "@/components/admin/ai-case-brief";
export const dynamic = "force-dynamic";
export const metadata = { title: "Synthetic Case Brief · Hustlen’ Admin" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!syntheticBriefEnabled()) notFound();
  await requireAdminPage();
  if (Object.keys(await searchParams).length) notFound();
  return <SyntheticCaseBrief initialLocale={await readLocale()} initialTheme={await readAppearance()} />;
}
