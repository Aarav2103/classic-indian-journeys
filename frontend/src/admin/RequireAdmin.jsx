import React, { useContext } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

/**
 * Gates the admin area:
 *  - not logged in  -> redirect to /login?redirect=<here>
 *  - logged in, not admin -> "not authorised" screen
 *  - admin -> render children
 */
const RequireAdmin = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
        <div className="ds-card p-10 max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center mb-5">
            <i className="ri-lock-2-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-brand-espresso">Admins only</h1>
          <p className="ds-small mt-3 text-brand-muted">
            You're signed in as <strong>{user.username}</strong>, but this area
            needs an administrator account.
          </p>
          <Link to="/" className="ds-btn ds-btn-primary ds-btn-sm mt-6">
            Back to site
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default RequireAdmin;
