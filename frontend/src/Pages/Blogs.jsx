import React, { useEffect, useState } from "react";
import Newsletter from "../Shared/Newsletter";
import BlogCard from "../Shared/BlogCard";
import { Container, Row, Col } from "reactstrap";
import axios from "axios";
import { BASE_URL } from "../utils/config";

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/blogs`);
        setBlogs(response.data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        setError(true);
      }
    };
    fetchBlogs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#fffaf2]">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-dark font-medium text-lg">Fetching timeless stories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#fffaf2]">
        <p className="text-red-600 text-lg font-medium mb-4">Couldn’t load the travel blogs.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 rounded-full bg-gold text-white font-semibold hover:opacity-90 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#fffaf2] font-body">
      {/* Hero */}
      <section className="py-20 text-center px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-heading text-dark mb-4">
            Travel Stories, Curated with Soul
          </h1>
          <p className="text-lg text-[#5e4a2e] leading-7">
            Explore India through the eyes of our travelers and curators — tales from sacred rivers, desert forts, monsoon mountains and more.
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="pb-20">
        <Container>
          <Row>
            {blogs.length > 0 ? (
              blogs.map((blog) => (
                <Col lg="4" md="6" sm="12" className="mb-6" key={blog._id}>
                  <BlogCard blog={blog} />
                </Col>
              ))
            ) : (
              <div className="w-full text-center py-16 text-[#5e4a2e]">
                <p className="text-lg">No blogs available right now. Check back soon!</p>
              </div>
            )}
          </Row>
        </Container>
      </section>

      <Newsletter />
    </div>
  );
};

export default Blogs;
