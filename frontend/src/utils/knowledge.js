// Helpers for the knowledge corpus surfaces (FAQ / Policies / Guides pages)
// and the concierge's clickable citations. Keeping the slug + link logic here
// means a source chip and the page it opens always agree.

export const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Where a knowledge chunk lives on the site. FAQs and policies are single pages
// (anchored per item); region & seasonal guides are per-article pages keyed by
// the source title's slug. `id` (the chunk _id) becomes the scroll anchor.
export const knowledgeHref = ({ category, sourceTitle, region, tourRef, id } = {}) => {
  const anchor = id ? `#${id}` : "";
  if (category === "faq") return `/faq${anchor}`;
  if (category === "policy") return `/policies${anchor}`;
  // Per-journey fine print lives on the tour page; a region's permits live on its
  // region guide (whose slug is deterministically `<region>-destination-guide`).
  if (category === "tour-info") return tourRef ? `/tours/${tourRef}${anchor}` : "/tours";
  if (category === "permit") return region ? `/guides/${region}-destination-guide${anchor}` : `/faq${anchor}`;
  return `/guides/${slugify(sourceTitle || "")}${anchor}`;
};

// Curated region hero overrides, used where a region's auto-picked tour photo
// isn't a good card/hero image (e.g. a dark, letterboxed shot that reads as black
// borders when cropped). Used by the Guides hub card + the guide detail hero.
export const REGION_IMAGE = {
  // central-india's first tour ("In The Search of Buddha") is a dark statue on
  // black; use the bright heritage-dome shot instead.
  "central-india":
    "https://images.unsplash.com/photo-1739388905138-6b75381582f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
};

// Group an array of corpus chunks into articles (chunks sharing a sourceTitle),
// preserving order. Used by the Guides hub + detail pages.
export const groupBySource = (chunks = []) => {
  const map = new Map();
  for (const c of chunks) {
    const key = c.sourceTitle || c.title;
    if (!map.has(key)) {
      map.set(key, { sourceTitle: key, slug: slugify(key), category: c.category, region: c.region || "", sections: [] });
    }
    map.get(key).sections.push(c);
  }
  return [...map.values()];
};
