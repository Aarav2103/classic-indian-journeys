import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL, API_TIMEOUT } from "../utils/config";
import Button from "../ui/Button";
import { Input } from "../ui/Input";
import Alert from "../ui/Alert";
import SafeImage from "../ui/SafeImage";
import Eyebrow from "../ui/Eyebrow";

// Kerala backwaters, see CREDITS.md
const SIDE_IMAGE =
  "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=85";

const Register = () => {
  const [credentials, setCredentials] = useState({ username: "", email: "", password: "" });
  const [emailValid, setEmailValid] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "email") {
      setEmailValid(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value) || value === "");
    }
    setCredentials((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (!emailValid) {
      setStatus({ type: "error", msg: "Please enter a valid email address." });
      return;
    }
    setSubmitting(true);
    dispatch({ type: "REGISTER_START" });
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      const result = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", msg: result.message || "Registration failed" });
        dispatch({ type: "REGISTER_FAILURE", payload: result.message });
      } else {
        setStatus({ type: "success", msg: "Account created. Redirecting to sign in..." });
        dispatch({ type: "REGISTER_SUCCESS", payload: result });
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (err) {
      setStatus({ type: "error", msg: "Something went wrong. Please try again." });
      dispatch({ type: "REGISTER_FAILURE", payload: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-brand-cream min-h-[80vh] py-16 md:py-24">
      <div className="ds-container max-w-5xl">
        <div className="ds-card overflow-hidden grid md:grid-cols-2">
          <div className="hidden md:block relative">
            <SafeImage
              src={SIDE_IMAGE}
              alt="Kerala backwaters at dawn"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/70 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 text-brand-parchment">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-gold-light mb-2">
                Classic Indian Journeys
              </p>
              <p className="font-heading text-2xl">
                Begin your collection of journeys.
              </p>
            </div>
          </div>

          <div className="p-8 md:p-12">
            <div className="mb-8 text-center">
              <img src="/logo-final.webp" alt="" className="h-14 mx-auto mb-4" />
              <Eyebrow>Account</Eyebrow>
              <h1 className="ds-h3 mt-2">Create an account</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="username"
                label="Name"
                value={credentials.username}
                onChange={handleChange}
                placeholder="What we should call you"
                required
              />
              <Input
                id="email"
                type="email"
                label="Email"
                value={credentials.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                error={!emailValid ? "Please enter a valid email address." : null}
              />
              <div>
                <label htmlFor="password" className="ds-label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="--------"
                    required
                    className="ds-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center text-brand-muted hover:text-brand-espresso"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`text-lg ri-eye${showPassword ? "-off" : ""}-line`} />
                  </button>
                </div>
              </div>

              {status && (
                <Alert tone={status.type === "success" ? "success" : "error"} onClose={() => setStatus(null)}>
                  {status.msg}
                </Alert>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create account"}
              </Button>
            </form>

            <p className="ds-small text-center mt-6">
              Already have an account?{" "}
              <Link to="/login" className="ds-anchor">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;
