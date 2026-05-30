import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/client";
import Button from "../../ui/Button";
import { Input } from "../../ui/Input";
import Alert from "../../ui/Alert";
import { useCurrency } from "../../context/CurrencyContext";

const Booking = ({ tour, avgRating, reviewCount = 0 }) => {
  const { price, _id, title, address } = tour;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { format } = useCurrency();

  const [booking, setBooking] = useState({
    fullName: "",
    phone: "",
    bookAt: "",
    groupSize: "",
  });

  const [status, setStatus] = useState(null); // success | error | login | submitting
  const today = new Date().toISOString().split("T")[0];

  const handleChange = (e) => {
    setBooking((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setStatus("login");
      return;
    }
    setStatus("submitting");
    try {
      await api.post("/booking", {
        tourId: _id,
        fullName: booking.fullName,
        phone: booking.phone,
        groupSize: booking.groupSize,
        bookAt: booking.bookAt,
      });
      setStatus("success");
      setTimeout(() => navigate("/thank-you"), 1000);
    } catch {
      setStatus("error");
    }
  };

  const groupSizeNum = parseInt(booking.groupSize, 10);
  const total =
    price > 0 && groupSizeNum > 0
      ? price * groupSizeNum
      : price > 0
        ? price
        : null;

  return (
    <aside className="ds-card p-7 md:p-8 lg:sticky lg:top-28 self-start">
      <div className="mb-6 pb-6 border-b border-brand-line">
        <p className="ds-eyebrow">Starting from</p>
        <p className="font-heading text-3xl text-brand-espresso mt-2">
          {format(price) || "On request"}
          {price > 0 && (
            <span className="text-sm text-brand-muted ml-2 font-body">/ person</span>
          )}
        </p>
        {avgRating > 0 && (
          <p className="ds-small mt-2 flex items-center gap-1.5">
            <i className="ri-star-fill text-brand-gold" />
            {avgRating} · {reviewCount} reviews
          </p>
        )}
      </div>

      <h3 className="ds-h4 mb-5">Reserve this journey</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="fullName"
          name="fullName"
          label="Full name"
          required
          value={booking.fullName}
          onChange={handleChange}
          placeholder="Your name"
        />
        <Input
          id="phone"
          name="phone"
          type="tel"
          label="Phone"
          required
          value={booking.phone}
          onChange={handleChange}
          placeholder="+91 ..."
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="bookAt"
            name="bookAt"
            type="date"
            label="Travel date"
            required
            min={today}
            value={booking.bookAt}
            onChange={handleChange}
          />
          <Input
            id="groupSize"
            name="groupSize"
            type="number"
            label="Travellers"
            min="1"
            required
            value={booking.groupSize}
            onChange={handleChange}
            placeholder="2"
          />
        </div>

        {total !== null && (
          <div className="rounded-md bg-brand-cream p-4 flex items-center justify-between">
            <span className="text-sm text-brand-muted">
              {groupSizeNum > 0 ? `${groupSizeNum} traveller${groupSizeNum === 1 ? "" : "s"}` : "Indicative"}
            </span>
            <span className="font-heading text-xl text-brand-espresso">
              {format(total)}
            </span>
          </div>
        )}

        {status === "success" && (
          <Alert tone="success">Booking received. Redirecting...</Alert>
        )}
        {status === "error" && (
          <Alert tone="error" onClose={() => setStatus(null)}>
            Something went wrong. Please try again.
          </Alert>
        )}
        {status === "login" && (
          <Alert tone="warning" onClose={() => setStatus(null)}>
            Please log in to book this journey.
          </Alert>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Sending..." : "Book journey"}
        </Button>

        <p className="ds-small text-center pt-2">
          No payment taken yet, we'll confirm before any charge.
        </p>
      </form>

      {/* Tailor this exact journey in the conversational planner (seeds the chat). */}
      <div className="mt-6 pt-6 border-t border-brand-line text-center">
        <p className="ds-small text-brand-muted mb-3">Not quite right? Make it yours.</p>
        <Button
          to={`/plan?q=${encodeURIComponent(
            `I'd like to base a trip on your "${title}" journey${address ? ` (${address})` : ""}. Help me customise it for us.`
          )}`}
          variant="secondary"
          size="lg"
          className="w-full"
        >
          <i className="ri-sparkling-2-line mr-1" /> Customise with AI
        </Button>
      </div>
    </aside>
  );
};

export default Booking;
