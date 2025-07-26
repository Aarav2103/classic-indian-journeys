import React from "react";
import useFetch from "../hooks/useFetch";
import TourCard from "../Shared/TourCard";
import SearchBar from "../Shared/SearchBar";
import Newsletter from "../Shared/Newsletter";
import { Container, Row, Col } from "reactstrap";

const Tours = () => {
  const { data: tours, loading, error } = useFetch("tours");

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#fffaf2]">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-dark font-medium text-lg font-body">
          Fetching curated journeys for you...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#fffaf2]">
        <p className="text-red-600 text-lg font-medium font-body mb-4">
          Alas! We couldn't retrieve the journeys at the moment.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-full bg-gold text-white font-semibold hover:opacity-90 transition font-body"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#fffaf2] font-body">
      {/* HERO */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h1 className="text-4xl md:text-5xl font-heading text-dark mb-4">
            Handpicked Journeys Across Incredible India
          </h1>
          <p className="text-lg text-[#5e4a2e] max-w-xl mx-auto leading-7">
            Discover soulful experiences that blend heritage, elegance, and culture — each voyage crafted to resonate deeply.
          </p>
        </div>
      </section>

      {/* SEARCH */}
      <section className="pb-12">
        <Container>
          <Row className="justify-center">
            <Col lg="10">
              <div className="bg-white shadow-lg rounded-2xl px-6 py-5">
                <SearchBar />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* TOURS GRID */}
      <section className="pb-20">
        <Container>
          <Row>
            {Array.isArray(tours) && tours.length > 0 ? (
              tours.map((tour) => (
                <Col lg="4" md="6" sm="12" className="mb-8" key={tour._id}>
                  <TourCard tour={tour} />
                </Col>
              ))
            ) : (
              <div className="text-center w-full py-12 text-[#5e4a2e] font-body">
                <p className="text-lg">
                  No experiences match your search. Kindly refine your journey preferences.
                </p>
              </div>
            )}
          </Row>
        </Container>
      </section>

      <Newsletter />
    </div>
  );
};

export default Tours;
