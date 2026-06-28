import React, { useContext, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL, API_TIMEOUT } from "../utils/config";
import Button from "../ui/Button";
import { Input } from "../ui/Input";
import Alert from "../ui/Alert";
import SafeImage from "../ui/SafeImage";
import Eyebrow from "../ui/Eyebrow";

// Served from our own bundle so the panel never falls back to a placeholder
// when a CDN is slow or blocked.
const SIDE_IMAGE = "/images/destinations/jaipur-palace.jpg";

const reveal = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.25, ease: "easeOut" },
};

const Login = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const handleChange = (e) => {
    const { id, value } = e.target;
    setCredentials((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      const result = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", msg: result.message || "Login failed" });
        dispatch({ type: "LOGIN_FAILURE", payload: result.message });
      } else {
        setStatus({ type: "success", msg: "Welcome back." });
        dispatch({ type: "LOGIN_SUCCESS", payload: result });
        setTimeout(() => navigate(redirectTo), 700);
      }
    } catch (err) {
      setStatus({ type: "error", msg: "An error occurred. Please try again." });
      dispatch({ type: "LOGIN_FAILURE", payload: err.message });
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
              alt="City Palace, Jaipur"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/70 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 text-brand-parchment">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-gold-light mb-2">
                Classic Indian Journeys
              </p>
              <p className="font-heading text-2xl">
                Welcome back.
              </p>
            </div>
          </div>

          <div className="p-8 md:p-12">
            <div className="mb-8 text-center">
              <img src="/logo-final.webp" alt="" className="h-14 mx-auto mb-4" />
              <Eyebrow>Account</Eyebrow>
              <h1 className="ds-h3 mt-2">Sign in</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="email"
                type="email"
                label="Email"
                value={credentials.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
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

              <AnimatePresence>
                {status && (
                  <motion.div {...reveal} className="overflow-hidden">
                    <Alert
                      tone={status.type === "success" ? "success" : "error"}
                      onClose={() => setStatus(null)}
                    >
                      {status.msg}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p className="ds-small text-center mt-6">
              New here?{" "}
              <Link to="/register" className="ds-anchor">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
