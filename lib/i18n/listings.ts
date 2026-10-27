import { message, type Locale } from "./core";
import type { MessageId } from "./catalogues";
const categories: Readonly<Record<string, MessageId>> = {
  Cameras: "category.cameras",
  "Camping & Outdoors": "category.camping",
  Electronics: "category.electronics",
  "Home & Kitchen": "category.home",
  "Musical Instruments": "category.music",
  "Sports & Fitness": "category.sports",
  Tools: "category.tools",
  Other: "category.other",
};
const details: Readonly<Record<string, MessageId>> = {
  brandModel: "detail.brandModel",
  includedAccessories: "detail.includedAccessories",
  capacity: "detail.capacity",
  dimensions: "detail.dimensions",
  specifications: "detail.specifications",
  materials: "detail.materials",
  instrumentType: "detail.instrumentType",
  size: "detail.size",
};
export function categoryLabel(locale: Locale, value: string) {
  return Object.prototype.hasOwnProperty.call(categories, value)
    ? message(locale, categories[value])
    : value;
}
export function detailLabel(locale: Locale, value: string) {
  return Object.prototype.hasOwnProperty.call(details, value)
    ? message(locale, details[value])
    : value;
}
