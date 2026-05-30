import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Eyebrow from "../ui/Eyebrow";
import Divider from "../ui/Divider";
import SafeImage from "../ui/SafeImage";
import { BASE_URL } from "../utils/config";
import { groupBySource, REGION_IMAGE } from "../utils/knowledge";
import { regionLabel } from "../utils/regions";

// /guides, editorial hub built from the knowledge corpus. Two strands: destination
// guides (one per region, with a photo from that region's journeys) and seasonal /
// thematic inspiration (text). Replaces the thin off-brand "Journal" in the nav.

const GuideCard = ({ guide, photo }) => {
  const title = guide.region ? regionLabel(guide.region) : guide.sourceTitle;
  const teaser = guide.sections[0]?.body || "";
  return (
    <Link to={`/guides/${guide.slug}`} className="group ds-card ds-card-hover overflow-hidden flex flex-col">
      {photo && (
        <div className="h-40 overflow-hidden bg-brand-line">
          <SafeImage src={photo} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        <span className="ds-eyebrow text-brand-gold-dark mb-2">{guide.region ? "Destination guide" : "Travel guide"}</span>
        <h3 className="font-heading text-brand-espresso text-xl group-hover:text-brand-gold-dark transition-colors">{title}</h3>
        <div className="w-10 h-px bg-brand-gold/40 mt-3 mb-3" />
        <p className="ds-body text-brand-muted text-sm line-clamp-3 flex-1">{teaser}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm text-brand-gold-dark">
          Read guide <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
};

const Section = ({ eyebrow, title, lead, guides, photoFor }) =>
  guides.length ? (
    <div className="ds-container max-w-6xl pb-16">
      <div className="max-w-2xl mb-10">
        <span className="ds-eyebrow text-brand-gold-dark">{eyebrow}</span>
        <h2 className="ds-h3 mt-2">{title}</h2>
        {lead && <p className="ds-body text-brand-muted mt-2">{lead}</p>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {guides.map((g) => (
          <GuideCard key={g.slug} guide={g} photo={photoFor ? photoFor(g) : null} />
        ))}
      </div>
    </div>
  ) : null;

const Guides = () => {
  const [chunks, setChunks] = useState(null);
  const [photoByRegion, setPhotoByRegion] = useState({});

  useEffect(() => {
    let alive = true;
    axios.get(`${BASE_URL}/knowledge`).then((res) => alive && setChunks(res.data?.data || [])).catch(() => alive && setChunks([]));
    // Map each region -> a representative photo from its journeys, for the cards.
    axios
      .get(`${BASE_URL}/tours`)
      .then((res) => {
        if (!alive) return;
        const map = {};
        for (const t of res.data?.data || []) if (t.region && !map[t.region]) map[t.region] = t.photo;
        setPhotoByRegion(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const regionGuides = groupBySource((chunks || []).filter((c) => c.category === "region-guide"));
  const themeGuides = groupBySource((chunks || []).filter((c) => c.category === "guide"));

  return (
    <>
      <section className="bg-brand-cream pt-24 md:pt-28 pb-12 text-center">
        <div className="ds-container max-w-3xl">
          <Eyebrow>Travel guides</Eyebrow>
          <h1 className="ds-h1 mt-4 text-balance">Know India before you go</h1>
          <Divider className="my-5" />
          <p className="ds-lead text-pretty">
            Where to travel when, what each region is really like, and how to think about seasons,
            wildlife and pace, written by us, grounded in the journeys we run.
          </p>
        </div>
      </section>

      {chunks === null ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-brand-cream pb-8">
          <Section
            eyebrow="By region"
            title="Destination guides"
            lead="The texture of each region, its best season, and how to move through it."
            guides={regionGuides}
            photoFor={(g) => REGION_IMAGE[g.region] || photoByRegion[g.region]}
          />
          <Section
            eyebrow="When to go & inspiration"
            title="Seasons & themes"
            lead="Month-by-month timing, wildlife, honeymoons and family travel."
            guides={themeGuides}
          />
        </div>
      )}
    </>
  );
};

export default Guides;
