import { prisma } from "../prisma";
import { network } from "./network";
import { validateNetwork } from "./station-validation";
import { legacyCanonicalIds } from "./station-mapping";
export async function importMrt() {
  const errors = validateNetwork(network);
  if (errors.length || network.stations.length !== 120)
    throw new Error(errors.join("; ") || "Expected 120 physical stations");
  await prisma.$transaction(async (tx) => {
    for (const s of network.stations) {
      const legacy = Object.entries(legacyCanonicalIds).find(
        ([, id]) => id === s.id,
      )?.[0];
      const data = {
        canonicalId: s.id,
        nameEn: s.nameEn,
        nameZh: s.nameZh,
        lineCodes: Object.values(s.codes),
        operatorIds: s.operatorIds ?? [],
        systemIds: s.systemIds ?? [],
        operational: s.operational === true,
      };
      const existing = legacy
        ? await tx.mrtStation.findUnique({ where: { code: legacy } })
        : null;
      if (existing) {
        if (existing.canonicalId && existing.canonicalId !== s.id)
          throw new Error(`Conflicting legacy mapping: ${legacy}`);
        await tx.mrtStation.update({ where: { id: existing.id }, data });
      } else
        await tx.mrtStation.upsert({
          where: { canonicalId: s.id },
          update: data,
          create: {
            ...data,
            code: legacy ?? `official:${s.id}`,
            name: `${s.nameEn} · ${s.nameZh} · ${Object.values(s.codes).join(" / ")}`,
          },
        });
    }
  });
  console.log(
    "Imported 120 canonical MRT locations; historical station keys retained.",
  );
}
