import React, { useState, useContext } from "react";
import { Container, Row, Col, Form, FormGroup, Button } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../utils/config";
import loginImg from "../assets/images/login.png";
import userIcon from "../assets/images/user.png";

const Login = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setCredentials((prev) => ({ ...prev, [id]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleClick = async (e) => {
    e.preventDefault();
    setError(null);
    dispatch({ type: "LOGIN_START" });

    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.message);
        dispatch({ type: "LOGIN_FAILURE", payload: result.message });
      } else {
        setSuccess("Login successful!");
        dispatch({ type: "LOGIN_SUCCESS", payload: result });
        setTimeout(() => navigate("/"), 1000);
      }
    } catch (err) {
      setError("An error occurred. Please try again later.");
      dispatch({ type: "LOGIN_FAILURE", payload: err.message });
    }
  };

  return (
    <section className="bg-[#fffaf2] py-12">
      <Container>
        <Row>
          <Col lg="10" className="mx-auto">
            <div className="bg-white rounded-xl shadow-xl flex flex-col lg:flex-row overflow-hidden">
              {/* Image Block */}
              <div className="hidden lg:flex w-full lg:w-1/2 items-center justify-center bg-[#f5eee0] p-8">
                <img src={loginImg} alt="login" className="w-3/4 rounded-lg" />
              </div>

              {/* Form Block */}
              <div className="w-full lg:w-1/2 p-8 md:p-12">
                <div className="mb-6 flex flex-col items-center">
                  <img src={userIcon} alt="user" className="w-14 mb-2" />
                  <h2 className="text-2xl font-bold text-[#4c3a1a] font-serif">Welcome Back</h2>
                </div>

                {error && <div className="bg-red-100 text-red-800 px-4 py-2 rounded mb-3">{error}</div>}
                {success && <div className="bg-green-100 text-green-800 px-4 py-2 rounded mb-3">{success}</div>}

                <Form onSubmit={handleClick} className="space-y-4">
                  <FormGroup>
                    <input
                      type="email"
                      id="email"
                      placeholder="Email"
                      required
                      onChange={handleChange}
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </FormGroup>

                  <FormGroup className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="Password"
                      required
                      onChange={handleChange}
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    <i
                      className={`absolute top-2/4 right-4 -translate-y-2/4 text-lg cursor-pointer ri-eye${showPassword ? "-off" : "-line"}`}
                      onClick={togglePasswordVisibility}
                    ></i>
                  </FormGroup>

                  <Button
                    type="submit"
                    className="w-full bg-gold text-white py-2 rounded-lg font-medium hover:opacity-90 transition"
                  >
                    Login
                  </Button>
                </Form>

                <p className="mt-4 text-sm text-gray-600">
                  Don’t have an account?{" "}
                  <Link to="/register" className="font-semibold text-gold hover:underline">Register</Link>
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Login;
