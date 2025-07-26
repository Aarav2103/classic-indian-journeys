import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from "../utils/config";

const SearchBar = () => {
  const locationRef = useRef("");
  const distanceRef = useRef(0);
  const navigate = useNavigate();

  const searchHandler = async () => {
    const location = locationRef.current.value;
    const distance = distanceRef.current.value;

    const searchParams = new URLSearchParams();
    if (location) searchParams.append("city", location);
    if (distance) searchParams.append("distance", distance);

    try {
      const response = await axios.get(`${BASE_URL}/search?${searchParams}`);
      navigate(`/search?${searchParams}`, {
        state: { searchResult: response.data.data },
      });
    } catch (error) {
      alert("Failed to fetch search results: " + error.message);
    }
  };

  return (
    <div style={outerCardStyle}>
      <div style={inputWrapperStyle}>
        <i className="ri-map-pin-line" style={iconStyle}></i>
        <input
          type="text"
          placeholder="City"
          ref={locationRef}
          style={inputStyle}
        />
      </div>

      <div style={inputWrapperStyle}>
        <i className="ri-road-map-line" style={iconStyle}></i>
        <input
          type="number"
          placeholder="Distance (km)"
          ref={distanceRef}
          style={inputStyle}
        />
      </div>

      <button
        onClick={searchHandler}
        style={searchButtonStyle}
        onMouseOver={(e) =>
          (e.target.style.background =
            "linear-gradient(to right, #c98719, #b87414)")
        }
        onMouseOut={(e) =>
          (e.target.style.background =
            "linear-gradient(to right, #dda132, #c78618)")
        }
      >
        Search
      </button>
    </div>
  );
};

// ✅ New Styles
const outerCardStyle = {
  background: "rgba(255, 248, 234, 0.6)",
  backdropFilter: "blur(6px)",
  padding: "1rem",
  borderRadius: "1.2rem",
  border: "1px solid rgba(255, 210, 140, 0.4)",
  boxShadow: "0 0 30px rgba(255, 210, 140, 0.15)",
  maxWidth: "320px",
  margin: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  fontFamily: "Georgia, serif",
};

const inputWrapperStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  background: "rgba(255, 255, 255, 0.7)",
  padding: "0.4rem 0.7rem",
  borderRadius: "0.6rem",
  border: "1px solid #e3c78f",
};

const inputStyle = {
  padding: "0.2rem 0.3rem",
  border: "none",
  outline: "none",
  flex: 1,
  fontSize: "0.9rem",
  background: "transparent",
  fontFamily: "Georgia, serif",
  color: "#3d2b00",
};

const iconStyle = {
  fontSize: "1rem",
  color: "#b5761a",
};

const searchButtonStyle = {
  background: "linear-gradient(to right, #dda132, #c78618)",
  color: "#fff",
  border: "none",
  padding: "0.5rem",
  borderRadius: "0.6rem",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.95rem",
  fontFamily: "Georgia, serif",
  width: "100%",
  textAlign: "center",
  transition: "background 0.3s ease",
};

export default SearchBar;
