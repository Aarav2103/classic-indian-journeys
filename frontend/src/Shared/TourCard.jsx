import React, { useEffect } from "react";
import { Card, CardBody } from "reactstrap";
import { Link } from "react-router-dom";
import calculateAvgRating from "../utils/avgRating";

const TourCard = ({ tour }) => {
  const { _id, title, city, photo, price, reviews } = tour;
  const { totalRating, avgRating } = calculateAvgRating(reviews);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="tour__card" style={{ fontFamily: "serif" }}>
      <Card
        style={{
          border: "2px solid #d4a74144",
          borderRadius: "24px",
          overflow: "hidden",
          backgroundColor: "#FAF3E0",
          boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
          transition: "transform 0.3s ease",
        }}
        className="hover:scale-[1.015]"
      >
        {/* Image Section */}
        <div className="tour__img relative">
          <Link to={`/tours/${_id}`} onClick={handleScrollToTop}>
            <img
              src={photo}
              alt="tour"
              style={{
                width: "100%",
                height: "240px",
                objectFit: "cover",
                borderBottom: "2px solid #D4A741",
              }}
            />
          </Link>
          <span
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              backgroundColor: "#D4A741",
              color: "#fff",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: "600",
              fontFamily: "Cinzel, serif",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            }}
          >
            Featured
          </span>
        </div>

        {/* Card Body */}
        <CardBody style={{ padding: "1.5rem 1.7rem" }}>
          {/* Location & Rating */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.85rem",
              fontSize: "0.95rem",
              color: "#7C5E2E",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="ri-map-pin-line" style={{ color: "#D4A741" }}></i>
              {city}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="ri-star-fill" style={{ color: "#D4A741" }}></i>
              {avgRating === 0 ? (
                <span style={{ color: "#aaa" }}>Not Rated</span>
              ) : (
                <>
                  {avgRating} <span style={{ color: "#aaa" }}>({reviews.length})</span>
                </>
              )}
            </span>
          </div>

          {/* Title */}
          <h5
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#3b2b17",
              fontWeight: 500,
              fontSize: "1.2rem",
              marginBottom: "1rem",
              letterSpacing: "0.3px",
              lineHeight: "1.5",
              textTransform: "none", // ensures it's not all-caps
            }}
          >
            <Link
              to={`/tours/${_id}`}
              onClick={handleScrollToTop}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {title}
            </Link>
          </h5>

          {/* Price & Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "auto",
            }}
          >
            {price > 0 && (
              <div>
                <span
                  style={{
                    fontWeight: 500,
                    color: "#D4A741",
                    fontSize: "1rem",
                  }}
                >
                  ₹{price.toLocaleString("en-IN")}
                </span>
                <span
                  style={{
                    color: "#3b2b17",
                    fontSize: "0.85rem",
                    marginLeft: "4px",
                  }}
                >
                  /person
                </span>
              </div>
            )}

            <Link
              to={`/tours/${_id}`}
              onClick={handleScrollToTop}
              className="btn"
              style={{
                backgroundColor: "#D4A741",
                color: "white",
                padding: "6px 18px",
                borderRadius: "30px",
                fontWeight: "500",
                fontSize: "0.88rem",
                border: "none",
                textDecoration: "none",
                fontFamily: "Cinzel, serif",
                boxShadow: "0 4px 12px rgba(212,167,65,0.3)",
              }}
            >
              Book Now
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default TourCard;
