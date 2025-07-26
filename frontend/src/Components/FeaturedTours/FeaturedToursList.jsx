import React from 'react';
import TourCard from '../../Shared/TourCard';
import { Button, Col } from 'reactstrap';
import useFetch from '../../hooks/useFetch';
import { Link } from 'react-router-dom';

const FeaturedToursList = () => {
  const { data: featuredTours, loading } = useFetch(`tours/featured`);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader" />
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
   <>
  <div className="row justify-content-center g-4">
    {Array.isArray(featuredTours) &&
      featuredTours.slice(0, 6).map((tour) => (
        <Col lg="4" md="6" sm="12" className="mb-4" key={tour._id}>
          <TourCard tour={tour} />
        </Col>
      ))}
  </div>

  {/* Centered "View All Tours" Button */}
 <div className="d-flex justify-content-center mt-4 w-100">
  <Link to="/tours">
    <Button
      className="btn transition"
      style={{
        backgroundColor: "#D4A741",
        border: "none",
        borderRadius: "30px",
        padding: "0.5rem 1.5rem",
        fontWeight: 500,
        fontSize: "1.05rem",
        color: "#fff",
        transition: "all 0.3s ease-in-out",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = "#b88d2f";
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = "#D4A741";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      View All Tours
    </Button>
  </Link>
</div>



</>

  );
};

export default FeaturedToursList;
