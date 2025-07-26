import React, { useEffect } from "react";
import { Card, CardBody } from "reactstrap";
import { Link } from "react-router-dom";

const BlogCard = ({ blog }) => {
  const { _id, title, author, date, photo, comments } = blog;

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="blog__card" style={{ fontFamily: "serif" }}>
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
        <div className="blog__img relative">
          <Link to={`/blogs/${_id}`} onClick={handleScrollToTop}>
            <img
              src={photo}
              alt={title}
              style={{
                width: "100%",
                height: "240px",
                objectFit: "cover",
                borderBottom: "2px solid #D4A741",
              }}
            />
          </Link>
        </div>

        {/* Card Body */}
        <CardBody style={{ padding: "1.5rem 1.7rem" }}>
          {/* Author & Date */}
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
              <i className="ri-user-line" style={{ color: "#D4A741" }}></i>
              {author}
            </span>
            <span style={{ color: "#aaa" }}>{date}</span>
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
              textTransform: "none",
            }}
          >
            <Link
              to={`/blogs/${_id}`}
              onClick={handleScrollToTop}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {title}
            </Link>
          </h5>

          {/* Comments & Read More */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "auto",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#D4A741",
                fontWeight: 500,
                fontSize: "0.95rem",
              }}
            >
              {comments.length}
              <span style={{ color: "#3b2b17", fontWeight: 400, marginLeft: "4px" }}>
                comments
              </span>
            </p>

            <Link
              to={`/blogs/${_id}`}
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
              Read More
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default BlogCard;
