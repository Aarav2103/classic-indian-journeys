import React from "react";
import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import TourCard from "../../shared/TourCard";
import Button from "../../ui/Button";

const Skeleton = () => (
  <div className="ds-card animate-pulse">
    <div className="aspect-[4/3] bg-brand-line" />
    <div className="p-6 space-y-3">
      <div className="h-3 w-1/3 bg-brand-line rounded" />
      <div className="h-5 w-3/4 bg-brand-line rounded" />
      <div className="h-3 w-1/2 bg-brand-line rounded" />
    </div>
  </div>
);

const FeaturedToursList = () => {
  const { data: featuredTours, loading, error } = useFetch("tours/featured");

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[0, 1, 2].map((i) => <Skeleton key={i} />)}
      </div>
    );
  }

  if (error || !Array.isArray(featuredTours) || featuredTours.length === 0) {
    return (
      <p className="text-center text-brand-muted py-12">
        Featured journeys will appear here soon.
      </p>
    );
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {featuredTours.slice(0, 6).map((tour) => (
          <TourCard key={tour._id} tour={tour} />
        ))}
      </div>
      <div className="flex justify-center mt-14">
        <Button to="/tours" variant="ghost" size="lg">
          View all journeys
          <i className="ri-arrow-right-line text-base" />
        </Button>
      </div>
    </>
  );
};

export default FeaturedToursList;
