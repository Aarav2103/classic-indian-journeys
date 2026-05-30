// Single source of truth for region slugs. The `value` must match what's
// stored in `tour.region` and used by /tours/region/:region.
export const REGIONS = [
  { value: "north-india", label: "North India" },
  { value: "rajasthan", label: "Rajasthan" },
  { value: "south-india", label: "South India" },
  { value: "east-india", label: "East India" },
  { value: "west-india", label: "West India" },
  { value: "central-india", label: "Central India" },
  { value: "north-east-india", label: "North East India" },
  { value: "leh-ladakh", label: "Leh Ladakh" },
];

export const regionLabel = (value) =>
  REGIONS.find((r) => r.value === value)?.label || value;
