import React, { useState, useContext } from "react";
import "./Booking.css";
import {
  Form,
  FormGroup,
  Button,
  Alert,
} from "reactstrap";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { BASE_URL } from "../../utils/config";

const Booking = ({ tour }) => {
  const { price, title } = tour;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [booking, setBooking] = useState({
    userId: user?.username,
    userEmail: user?.email,
    tourName: title,
    fullName: "",
    phone: "",
    bookAt: "",
    groupSize: "",
  });

  const [isBookingSuccessful, setIsBookingSuccessful] = useState(false);
  const [isBookingFailed, setIsBookingFailed] = useState(false);
  const [isLoginAlertVisible, setIsLoginAlertVisible] = useState(false);

  const handleChange = (e) => {
    setBooking((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleClick = async (e) => {
    e.preventDefault();

    if (!user) {
      setIsLoginAlertVisible(true);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(booking),
      });

      if (response.ok) {
        setIsBookingSuccessful(true);
        setIsBookingFailed(false);
        setBooking({
          ...booking,
          fullName: "",
          phone: "",
          bookAt: "",
          groupSize: "",
        });
        setTimeout(() => navigate("/thank-you"), 1200);
      } else {
        setIsBookingFailed(true);
      }
    } catch (err) {
      setIsBookingFailed(true);
    }
  };

  const currentDate = new Date().toISOString().split("T")[0];

  return (
    <div
      className="booking rounded-4 shadow p-4"
      style={{
        background: "#f9f4ee",
        fontFamily: "'Playfair Display', serif",
        border: "1px solid #e3d5bc",
      }}
    >
      {/* Alerts */}
      {isBookingSuccessful && <Alert color="success">Booking Confirmed!</Alert>}
      {isBookingFailed && <Alert color="danger">Something went wrong. Please try again.</Alert>}
      {isLoginAlertVisible && <Alert color="warning">Please log in to book your journey.</Alert>}

      {/* Price */}
      {/* <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
        <h3 className="text-dark-emphasis" style={{ fontWeight: "bold" }}>
          ${price}
          <span style={{ fontSize: "0.9rem", color: "#666" }}> /person</span>
        </h3>
      </div> */}

      {/* Form */}
      <div className="mb-4">
        <h5 className="fw-semibold mb-3" style={{ color: "#7c5c28", fontFamily: "'Cinzel', serif", fontSize: "1.1rem" }}>
          Booking Details
        </h5>
        <Form>
          <FormGroup>
            <input
              type="text"
              id="fullName"
              placeholder="Your Full Name"
              value={booking.fullName}
              onChange={handleChange}
              required
              className="form-control"
              style={{
                borderRadius: "12px",
                border: "1px solid #ccb892",
                backgroundColor: "#fffdf9",
              }}
            />
          </FormGroup>
          <FormGroup>
            <input
              type="tel"
              id="phone"
              placeholder="Phone Number"
              value={booking.phone}
              onChange={handleChange}
              required
              className="form-control"
              style={{
                borderRadius: "12px",
                border: "1px solid #ccb892",
                backgroundColor: "#fffdf9",
              }}
            />
          </FormGroup>
          <FormGroup className="d-flex gap-3">
            <input
              type="date"
              id="bookAt"
              min={currentDate}
              value={booking.bookAt}
              onChange={handleChange}
              required
              className="form-control"
              style={{
                borderRadius: "12px",
                border: "1px solid #ccb892",
                backgroundColor: "#fffdf9",
              }}
            />
            <input
              type="number"
              id="groupSize"
              placeholder="Group Size"
              value={booking.groupSize}
              onChange={handleChange}
              required
              className="form-control"
              style={{
                borderRadius: "12px",
                border: "1px solid #ccb892",
                backgroundColor: "#fffdf9",
              }}
            />
          </FormGroup>
        </Form>
      </div>

      {/* Book Button */}
      <Button
        onClick={handleClick}
        className="w-100"
        style={{
          backgroundColor: "#b78e35",
          border: "none",
          padding: "0.75rem",
          fontSize: "1.05rem",
          fontWeight: 600,
          borderRadius: "30px",
          fontFamily: "'Cinzel', serif",
          letterSpacing: "0.5px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          transition: "all 0.3s ease-in-out",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#a07b2f";
          e.currentTarget.style.transform = "scale(1.04)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "#b78e35";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        Book Now
      </Button>
    </div>
  );
};

export default Booking;
