export const listingCategories = [
  "Cameras",
  "Camping & Outdoors",
  "Electronics",
  "Home & Kitchen",
  "Musical Instruments",
  "Sports & Fitness",
  "Tools",
  "Other",
] as const;

export type ListingCategory = (typeof listingCategories)[number];

export const categoryDetailFields: Record<ListingCategory, Array<{ key: string; label: string; placeholder: string }>> = {
  Cameras: [
    { key: "brandModel", label: "Brand and model", placeholder: "Sony A7 III" },
    { key: "includedAccessories", label: "Included accessories", placeholder: "Lens, batteries, charger" },
  ],
  "Camping & Outdoors": [
    { key: "capacity", label: "Capacity", placeholder: "3 people" },
    { key: "dimensions", label: "Packed dimensions", placeholder: "60 x 20 x 18 cm" },
  ],
  Electronics: [
    { key: "brandModel", label: "Brand and model", placeholder: "Apple MacBook Air 13-inch" },
    { key: "specifications", label: "Key specifications", placeholder: "M3, 16 GB RAM, 512 GB SSD" },
  ],
  "Home & Kitchen": [
    { key: "dimensions", label: "Dimensions", placeholder: "45 x 30 x 25 cm" },
    { key: "materials", label: "Material or capacity", placeholder: "Stainless steel, 5 L" },
  ],
  "Musical Instruments": [
    { key: "instrumentType", label: "Instrument type", placeholder: "Acoustic guitar" },
    { key: "includedAccessories", label: "Included accessories", placeholder: "Case, strap, tuner" },
  ],
  "Sports & Fitness": [
    { key: "size", label: "Size or fit", placeholder: "Medium, 170-180 cm" },
    { key: "specifications", label: "Relevant specifications", placeholder: "Resistance range, weight limit" },
  ],
  Tools: [
    { key: "brandModel", label: "Brand and model", placeholder: "Makita DHP484" },
    { key: "specifications", label: "Power or specifications", placeholder: "18 V, 54 Nm" },
  ],
  Other: [
    { key: "brandModel", label: "Brand and model", placeholder: "Brand and model, if known" },
    { key: "dimensions", label: "Size or dimensions", placeholder: "Approximate size" },
  ],
};