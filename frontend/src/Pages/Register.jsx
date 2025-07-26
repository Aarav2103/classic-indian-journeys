import React, { useState, useContext } from "react";
import { Container, Row, Col, Form, FormGroup, Button } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../utils/config";
import registerImg from "../assets/images/register.png";
import userIcon from "../assets/images/user.png";

const Register = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setCredentials((prev) => ({ ...prev, [id]: value }));
  };

  const validateEmail = (email) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  const handleEmailChange = (e) => {
    setIsEmailValid(validateEmail(e.target.value));
    handleChange(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleClick = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    dispatch({ type: "REGISTER_START" });

    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.message);
        dispatch({ type: "REGISTER_FAILURE", payload: result.message });
      } else {
        setSuccess("Registration successful!");
        dispatch({ type: "REGISTER_SUCCESS", payload: result });
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      dispatch({ type: "REGISTER_FAILURE", payload: err.message });
    }
  };

  return (
    <section className="bg-[#fffaf2] py-12">
      <Container>
        <Row>
          <Col lg="10" className="mx-auto">
            <div className="bg-white rounded-xl shadow-xl flex flex-col lg:flex-row overflow-hidden">
              {/* Left Image */}
              <div className="hidden lg:flex w-full lg:w-1/2 items-center justify-center bg-[#f5eee0] p-8">
                <img src={registerImg} alt="register" className="w-3/4 rounded-lg" />
              </div>

              {/* Right Form */}
              <div className="w-full lg:w-1/2 p-8 md:p-12">
                <div className="mb-6 flex flex-col items-center">
                  <img src={userIcon} alt="user" className="w-14 mb-2" />
                  <h2 className="text-2xl font-bold text-[#4c3a1a] font-serif">Create an Account</h2>
                </div>

                {error && <div className="bg-red-100 text-red-800 px-4 py-2 rounded mb-3">{error}</div>}
                {success && <div className="bg-green-100 text-green-800 px-4 py-2 rounded mb-3">{success}</div>}

                <Form onSubmit={handleClick} className="space-y-4">
                  <FormGroup>
                    <input
                      type="text"
                      id="username"
                      placeholder="Username"
                      required
                      onChange={handleChange}
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </FormGroup>

                  <FormGroup>
                    <input
                      type="email"
                      id="email"
                      placeholder="Email"
                      required
                      autoComplete="true"
                      onChange={handleEmailChange}
                      className={`w-full border px-4 py-2 rounded-lg focus:outline-none ${
                        isEmailValid ? "border-gray-300 focus:ring-gold" : "border-red-400 ring-1 ring-red-400"
                      }`}
                    />
                    {!isEmailValid && (
                      <p className="text-sm text-red-600 mt-1">Please enter a valid email address.</p>
                    )}
                  </FormGroup>

                  <FormGroup className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="Password"
                      required
                      autoComplete="true"
                      onChange={handleChange}
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold pr-10"
                    />
                    <i
                      className={`absolute top-2/4 right-4 -translate-y-2/4 text-lg cursor-pointer ri-eye${showPassword ? "-off" : "-line"}`}
                      onClick={togglePasswordVisibility}
                    ></i>
                  </FormGroup>

                  <Button
                    className="w-full bg-gold text-white py-2 rounded-lg font-medium hover:opacity-90 transition"
                    type="submit"
                  >
                    Register
                  </Button>
                </Form>

                <p className="mt-4 text-sm text-gray-600">
                  <Link to="/forgotpassword" className="hover:text-gold">Forgot Password?</Link>
                </p>
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-gold hover:underline">Login</Link>
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Register;
