import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TourCard from "../shared/TourCard";
import Newsletter from "../shared/Newsletter";
import PageHero from "../ui/PageHero";
import Button from "../ui/Button";
import { BASE_URL, API_TIMEOUT } from "../utils/config";

const Skeleton = () => (
  <div className="ds-card animate-pulse">
    <div className="aspect-[4/3] bg-brand-line" />
    <div className="p-6 space-y-3">
      <div className="h-3 w-1/3 bg-brand-line rounded" />
      <div className="h-5 w-3/4 bg-brand-line rounded" />
    </div>
  </div>
);

const titleCase = (s) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const RegionTourPage = () => {
  const { region } = useParams();
  const [tours, setTours] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/tours/region/${region}`, {
          signal: AbortSignal.timeout(API_TIMEOUT),
        });
        const data = await res.json();
        if (!cancelled) setTours(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [region]);

  const niceRegion = region ? titleCase(region) : "this region";

  return (
    <>
      <PageHero
        eyebrow="Region"
        title={`${niceRegion} journeys`}
        lead={`A current selection of itineraries through ${niceRegion}.`}
      />
      <section className="bg-brand-cream ds-section">
        <div className="ds-container">
          {tours === null && !error && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => <Skeleton key={i} />)}
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <p className="ds-lead mb-6">We couldn't load tours for this region right now.</p>
              <Button to="/tours" variant="primary">Browse all journeys</Button>
            </div>
          )}

          {tours && tours.length === 0 && (
            <div className="text-center py-16">
              <p className="ds-lead">
                No journeys published for {niceRegion} yet.
              </p>
              <Button to="/contact" variant="primary" className="mt-6">
                Ask us to design one
              </Button>
            </div>
          )}

          {tours && tours.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {tours.map((t) => (
                <TourCard key={t._id} tour={t} />
              ))}
            </div>
          )}
        </div>
      </section>
      <Newsletter />
    </>
  );
};

export default RegionTourPage;
