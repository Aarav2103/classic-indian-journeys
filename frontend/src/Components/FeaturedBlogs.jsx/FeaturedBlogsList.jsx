import React from "react";
import { Button, Col } from "reactstrap";
import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import BlogCard from "../../Shared/BlogCard";

// Clean royal-themed featured blogs list
const FeaturedBlogsList = ({ lg = "4", md = "6", sm = "12" }) => {
  const { data: featuredBlogs, loading } = useFetch(`blogs/featured`);

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
      {Array.isArray(featuredBlogs) &&
        featuredBlogs.slice(0, 3).map((blog) => (
          <Col
            lg={lg}
            md={md}
            sm={sm}
            className="mb-4 d-flex justify-content-center"
            key={blog._id}
          >
            <BlogCard blog={blog} />
          </Col>
        ))}

      {/* Centered button */}
    <div className="d-flex justify-content-center mt-4 w-100">
  <Link to="/blogs">
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
      View All Blogs
    </Button>
  </Link>
</div>

    </>
  );
};

export default FeaturedBlogsList;
