import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  ListGroup,
  Alert,
} from "reactstrap";
import avtar from "../assets/images/avatar.jpg";
import "../styles/Blogdetails.css";
import useFetch from "../hooks/useFetch";
import { useParams } from "react-router-dom";
import Newsletter from "../Shared/Newsletter";
import axios from "axios";
import { BASE_URL } from "../utils/config";
import { AuthContext } from "../context/AuthContext";

const BlogDetails = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState({});
  const commentMsgRef = useRef("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [commentStatus, setCommentStatus] = useState(null);
  const [isLoginAlertVisible, setIsLoginAlertVisible] = useState(false);

  const {
    data: fetchedComments,
    loading: loadingComments,
    error: errorComments,
  } = useFetch(`comment/${id}/`);

  const options = { day: "numeric", month: "long", year: "numeric" };

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/blogs/${id}`);
        setBlog(res.data);
        setLoading(false);
      } catch (err) {
        setError("Unable to fetch blog.");
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  useEffect(() => {
    if (fetchedComments) {
      setComments(fetchedComments);
    }
  }, [fetchedComments]);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!user) {
      setIsLoginAlertVisible(true);
      return;
    }

    const commentData = {
      comment: commentMsgRef.current.value,
      username: user.username,
    };

    try {
      const res = await axios.post(`${BASE_URL}/comment/${id}`, commentData);
      setComments([...comments, res.data]);
      setCommentStatus("success");
      commentMsgRef.current.value = "";

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setCommentStatus("error");
    }
  };

  if (loading || loadingComments) {
    return (
      <div className="loader-container">
        <div className="loader" />
        <div className="loading-text">Loading blog...</div>
      </div>
    );
  }

  if (error || !blog || errorComments) {
    return (
      <div className="error__msg">
        Error loading blog details. Check your network.
      </div>
    );
  }

  const { title, author, createdAt, photo, content } = blog;

  return (
    <>
      <section className="pt-5 pb-5 bg-light">
        <Container className="shadow-sm p-4 bg-white rounded">
          <Row>
            <Col lg="12">
              <article className="mb-5">
                <h1 className="display-5 fw-bold mb-3 text-dark">{title}</h1>
                <div className="d-flex justify-content-between text-muted small mb-4">
                  <span><i className="ri-user-line text-warning me-1"></i>{author}</span>
                  <span><i className="ri-calendar-line text-warning me-1"></i>{new Date(createdAt).toLocaleDateString("en-IN", options)}</span>
                </div>
                <img
                  src={photo}
                  alt="Blog Visual"
                  className="img-fluid rounded mb-4 w-100 shadow-sm"
                />
                <p className="fs-5 lh-lg text-secondary">{content}</p>
              </article>

              <section className="pt-4 border-top">
                <h4 className="mb-4 text-dark-emphasis">Comments ({comments.length})</h4>

                {commentStatus === "success" && (
                  <Alert color="success" toggle={() => setCommentStatus(null)}>
                    Comment posted successfully!
                  </Alert>
                )}
                {commentStatus === "error" && (
                  <Alert color="danger" toggle={() => setCommentStatus(null)}>
                    Failed to post comment.
                  </Alert>
                )}
                {isLoginAlertVisible && (
                  <Alert color="warning" toggle={() => setIsLoginAlertVisible(false)}>
                    Please login to post a comment.
                  </Alert>
                )}

                <Form onSubmit={submitHandler} className="mb-5">
                  <div className="d-flex">
                    <input
                      type="text"
                      placeholder="Leave a comment..."
                      required
                      ref={commentMsgRef}
                      className="form-control me-2 rounded-pill px-4"
                    />
                    <button className="btn btn-warning text-white rounded-pill px-4">Submit</button>
                  </div>
                </Form>

                <ListGroup className="user__reviews">
                  {comments?.map((comment, idx) => (
                    <div className="d-flex gap-3 border-bottom pb-3 mb-3" key={idx}>
                      <img
                        src={avtar}
                        alt="avatar"
                        className="rounded-circle"
                        style={{ width: "50px", height: "50px" }}
                      />
                      <div>
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="fw-bold mb-1">{comment.username}</h6>
                          <small className="text-muted">
                            {new Date(comment.createdAt).toLocaleDateString("en-IN", options)}
                          </small>
                        </div>
                        <p className="mb-0 text-secondary">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </ListGroup>
              </section>
            </Col>
          </Row>
        </Container>
      </section>
      <Newsletter />
    </>
  );
};

export default BlogDetails;