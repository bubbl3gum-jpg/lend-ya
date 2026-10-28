export type Bilingual = readonly [string, string];
export type DocumentationChecklist = { id: string; version: 1; areas: readonly { id: string; label: Bilingual }[]; accessories: Bilingual; functional: Bilingual };
const registry: Readonly<Record<string, DocumentationChecklist>> = {
 Cameras: { id: "camera", version: 1, areas: [
 { id: "body", label: ["Body, controls and existing wear", "機身、操作部位與既有磨損"] },
 { id: "optics", label: ["Lens exterior and visible glass; do not touch the sensor", "鏡頭外觀及可見鏡片；請勿觸碰感光元件"] },
 { id: "mount", label: ["Mount, ports and covers", "接環、連接埠與護蓋"] }], accessories: ["Declare each lens, cap, battery, charger and strap actually included; do not assume any is included.", "逐項聲明實際附上的鏡頭、鏡頭蓋、電池、充電器與背帶，不可假設皆有附上。"], functional: ["If safe: power, controls and a test image. Record unknowns; no authenticity finding.", "在安全情況下測試電源、操作及試拍。無法確認的項目請明示；不代表真偽鑑定。"] },
 Tools: { id: "power-tool", version: 1, areas: [
 { id: "housing", label: ["Housing, handle and existing wear", "外殼、握柄與既有磨損"] },
 { id: "working-end", label: ["Chuck / working end, disconnected from power", "夾頭／工作端（先切斷電源）"] },
 { id: "power", label: ["Cable / battery interface and safety guards", "電線／電池接點及安全護罩"] }], accessories: ["Declare actual battery, charger, bits, guards and case; specify quantity.", "聲明實際附上的電池、充電器、配件頭、護罩與收納箱，並註明數量。"], functional: ["Inspect unplugged first; only test safely according to the manufacturer. Never operate a damaged tool.", "先斷電檢視；僅依製造商指引安全測試，勿操作損壞的工具。"] },
 "Camping & Outdoors": { id: "camping", version: 1, areas: [
 { id: "fabric", label: ["Fabric, seams and existing wear", "布料、接縫與既有磨損"] },
 { id: "structure", label: ["Poles, joints and fasteners, where applicable", "營柱、接頭及固定部件（如適用）"] },
 { id: "closures", label: ["Zips, closures and packed contents", "拉鍊、開合部位與收納內容"] }], accessories: ["Declare actual poles, pegs, ropes, covers and bags; mark non-applicable components explicitly.", "聲明實際附上的營柱、營釘、營繩、外罩與袋子；不適用的部件請明確註記。"], functional: ["If safe: assembly and closures. Do not infer waterproofing from a photograph.", "在安全情況下測試組裝與開合。照片不能證明防水性能。"] }
};
const general: DocumentationChecklist = { id: "general", version: 1, areas: [{ id: "overall", label: ["Overall item and existing wear", "物品全貌與既有磨損"] }, { id: "details", label: ["Relevant details and connection points", "相關細節與連接部位"] }], accessories: ["Declare actual included parts and quantity; describe unknowns.", "聲明實際附上的部件及數量，並說明不確定之處。"], functional: ["Suggest only safe, applicable checks; never infer function from appearance.", "僅建議安全且適用的檢查；外觀不能證明功能正常。"] };
/** Return clones so callers cannot silently rewrite pinned definitions. New requirements require a new version. */
export function checklistFor(category: string): DocumentationChecklist { return structuredClone(Object.hasOwn(registry, category) ? registry[category] : general); }
export function pixelHints(pixels: Uint8Array, width: number, height: number) {
 if (pixels.length !== width * height || width < 2 || height < 2) throw Error("PIXELS");
 let sum = 0, edges = 0;
 for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = y * width + x; sum += pixels[i]; if (x) edges += Math.abs(pixels[i] - pixels[i - 1]); if (y) edges += Math.abs(pixels[i] - pixels[i - width]); }
 const mean = sum / pixels.length, edgeEnergy = edges / (2 * width * height - width - height);
 return { mean: Math.round(mean), edgeEnergy: Math.round(edgeEnergy * 100) / 100, warnings: [...(mean < 35 ? ["DARK"] : []), ...(mean > 225 ? ["BRIGHT"] : []), ...(edgeEnergy < 3 ? ["LOW_DETAIL"] : [])] };
}
