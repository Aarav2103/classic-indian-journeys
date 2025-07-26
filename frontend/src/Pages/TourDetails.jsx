import React, { useState, useRef, useEffect, useContext } from "react";
import { Container, Row, Col, Form, ListGroup, Alert } from "reactstrap";
import { useParams } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import calculateAvgRating from "../utils/avgRating";
import avtar from "../assets/images/avatar.jpg";
import Booking from "../Components/Booking/Booking";
import "../styles/Tourdetails.css";
import axios from "axios";
import { BASE_URL } from "../utils/config";
import { AuthContext } from "../context/AuthContext";
import FAQ from "../Shared/FAQ";

const TourDetails = () => {
  const { id } = useParams();
  const reviewMsgRef = useRef("");
  const [tourRating, setTourRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const { user } = useContext(AuthContext);
  const [isReviewSuccess, setIsReviewSuccess] = useState(false);
  const [isReviewError, setIsReviewError] = useState(false);
  const [isLoginAlertVisible, setIsLoginAlertVisible] = useState(false);

  const { data: tour, loading: loadingTour, error: errorTour } = useFetch(`tours/${id}`);
  const { data: fetchedReviews, loading: loadingReviews, error: errorReviews } = useFetch(`review/${id}/`);

  useEffect(() => {
    if (fetchedReviews) setReviews(fetchedReviews);
  }, [fetchedReviews]);

  if (loadingTour || loadingReviews) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#fffaf2] font-body">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-dark text-lg">Retrieving journey details...</p>
      </div>
    );
  }

  if (errorTour || !tour || errorReviews) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffaf2] text-red-600 font-body text-lg">
        Oops! Unable to load the tour details. Kindly check your connection.
      </div>
    );
  }

  const { photo, title, desc, city, distance, address, maxGroupSize } = tour;
  const { totalRating, avgRating } = calculateAvgRating(reviews);
  const options = { day: "numeric", month: "long", year: "numeric" };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!user) {
      setIsLoginAlertVisible(true);
      return;
    }

    const reviewMsg = reviewMsgRef.current.value;
    const reviewData = {
      rating: tourRating,
      reviewText: reviewMsg,
      username: user.username,
    };

    try {
      const response = await axios.post(`${BASE_URL}/review/${id}`, reviewData);
      setReviews([...reviews, response.data]);
      setTourRating(null);
      reviewMsgRef.current.value = "";
      setIsReviewSuccess(true);
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setIsReviewError(true);
    }
  };

  const handleRatingClick = (value) => {
    setTourRating(prev => (prev === value ? null : value));
  };

  return (
    <>
      <section className="bg-[#fffaf2] py-12 font-body">
        <Container>
          <Row>
            <Col lg="8">
              <div className="space-y-8">
                <img src={photo} alt={title} className="rounded-xl shadow mb-4" />

                <div className="space-y-6">
                  <h2 className="text-[2rem] font-[700] text-[#3b2b17]" style={{ fontFamily: "var(--playfair-font)", textTransform: "none" }}>
                    {title}
                  </h2>

                  <div className="flex flex-wrap gap-4 text-[#7b6245] text-sm">
                    {totalRating > 0 && (
                      <span className="flex items-center gap-1">
                        <i className="ri-star-fill text-gold"></i> {avgRating} <span className="text-[#a89c8d]">({reviews.length})</span>
                      </span>
                    )}
                    {address && (
                      <span className="flex items-center gap-1">
                        <i className="ri-map-pin-line text-gold"></i> {address}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-[#5e4a2e] text-sm">
                    {city && <div><i className="ri-map-pin-2-line text-gold mr-1"></i> {city}</div>}
                    {distance > 0 && <div><i className="ri-map-pin-line text-gold mr-1"></i> {distance} Km</div>}
                    {maxGroupSize > 0 && <div><i className="ri-group-line text-gold mr-1"></i> Max {maxGroupSize} people</div>}
                  </div>

                  <div>
                    <h5 className="text-[1.3rem] font-semibold mb-2" style={{ fontFamily: "var(--playfair-font)", textTransform: "none", color: "#3b2b17" }}>
                      Experience Overview
                    </h5>
                    <p className="text-[#4b3b28] leading-[1.7]">{desc}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-[1.3rem] font-semibold mb-4" style={{ fontFamily: "var(--playfair-font)", textTransform: "none", color: "#3b2b17" }}>
                    Guest Impressions ({reviews.length || 0})
                  </h4>

                  {isReviewSuccess && <Alert color="success" toggle={() => setIsReviewSuccess(false)}>Your thoughts were shared with grace.</Alert>}
                  {isReviewError && <Alert color="danger" toggle={() => setIsReviewError(false)}>Something went wrong. Kindly try again.</Alert>}
                  {isLoginAlertVisible && <Alert color="warning" toggle={() => setIsLoginAlertVisible(false)}>Kindly log in to leave a review.</Alert>}

                  <Form onSubmit={submitHandler} className="space-y-4 mt-4">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(value => (
                        <span
                          key={value}
                          onClick={() => handleRatingClick(value)}
                          className={`cursor-pointer px-2 py-1 rounded-full border ${tourRating === value ? "bg-gold text-white" : "border-gold text-gold"}`}
                        >
                          {value} <i className="ri-star-fill"></i>
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <input
                        type="text"
                        ref={reviewMsgRef}
                        placeholder="Share your thoughts..."
                        className="flex-1 border border-gold px-4 py-2 rounded-xl w-full"
                        required
                      />
                      <button type="submit" className="button-gold">Submit</button>
                    </div>
                  </Form>

                  <ListGroup className="space-y-4 mt-6">
                    {reviews.map((review, index) => (
                      <div key={index} className="flex gap-4 p-4 bg-white rounded-lg shadow-sm">
                        <img src={avtar} alt="avatar" className="h-12 w-12 rounded-full" />
                        <div className="flex-grow">
                          <div className="flex justify-between items-center mb-1">
                            <div>
                              <h5 className="text-[#3b2e20] font-semibold">{review.username}</h5>
                              <p className="text-sm text-[#7c6b4f]">{new Date(review.createdAt).toLocaleDateString("en-IN", options)}</p>
                            </div>
                            <span className="flex items-center text-gold">
                              {review.rating}
                              <i className="ri-star-s-fill ml-1"></i>
                            </span>
                          </div>
                          <h6 className="text-[#4b3b28]">{review.reviewText}</h6>
                        </div>
                      </div>
                    ))}
                  </ListGroup>
                </div>
              </div>
            </Col>

            <Col lg="4">
              <Booking tour={tour} avgRating={avgRating} reviews={reviews} />
            </Col>
          </Row>
        </Container>
      </section>

      <FAQ />
    </>
  );
};

export default TourDetails;
