import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Eager: landing page (fast first paint) + tiny shared bits.
import Home from '../pages/Home';
import ScrollToTop from '../utils/scrolltoTop';

// Lazy public pages, each becomes its own chunk, loaded on demand.
const About = lazy(() => import('../pages/About'));
const Tours = lazy(() => import('../pages/Tours'));
const TourDetails = lazy(() => import('../pages/TourDetails'));
const RegionTourPage = lazy(() => import('../pages/RegionTourPage'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ThankYou = lazy(() => import('../pages/ThankYou'));
const Gallery = lazy(() => import('../pages/Gallery'));
const Contact = lazy(() => import('../pages/Contact'));
const Faq = lazy(() => import('../pages/Faq'));
const Policies = lazy(() => import('../pages/Policies'));
const Guides = lazy(() => import('../pages/Guides'));
const GuideDetail = lazy(() => import('../pages/GuideDetail'));
const PageNotFound = lazy(() => import('../pages/PageNotFound'));
const Wishlist = lazy(() => import('../pages/Wishlist'));
const PlanJourney = lazy(() => import('../pages/PlanJourney'));

// Lazy admin, the whole admin bundle only loads for admins who visit /admin.
const AdminLayout = lazy(() => import('../admin/AdminLayout'));
const AdminDashboard = lazy(() => import('../admin/pages/Dashboard'));
const ToursAdmin = lazy(() => import('../admin/pages/ToursAdmin'));
const TourForm = lazy(() => import('../admin/pages/TourForm'));
const KnowledgeAdmin = lazy(() => import('../admin/pages/KnowledgeAdmin'));
const KnowledgeForm = lazy(() => import('../admin/pages/KnowledgeForm'));
const BookingsAdmin = lazy(() => import('../admin/pages/BookingsAdmin'));
const EnquiriesAdmin = lazy(() => import('../admin/pages/EnquiriesAdmin'));
const UsersAdmin = lazy(() => import('../admin/pages/UsersAdmin'));
const ModerationAdmin = lazy(() => import('../admin/pages/ModerationAdmin'));
const TrashAdmin = lazy(() => import('../admin/pages/TrashAdmin'));

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const Page = ({ children }) => {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div className="h-full" variants={pageVariants} initial="initial" animate="enter" exit="exit">
      {children}
    </motion.div>
  );
};

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center bg-brand-cream">
    <div className="w-9 h-9 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
  </div>
);

const Router = () => {
  const location = useLocation();

  // Admin area: its own layout, no marketing page transitions. Kept as a
  // stable (un-keyed) <Routes> so AdminLayout persists across sub-navigation.
  if (location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="tours" element={<ToursAdmin />} />
            <Route path="tours/new" element={<TourForm />} />
            <Route path="tours/:id/edit" element={<TourForm />} />
            <Route path="knowledge" element={<KnowledgeAdmin />} />
            <Route path="knowledge/new" element={<KnowledgeForm />} />
            <Route path="knowledge/:id/edit" element={<KnowledgeForm />} />
            <Route path="bookings" element={<BookingsAdmin />} />
            <Route path="enquiries" element={<EnquiriesAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
            <Route path="moderation" element={<ModerationAdmin />} />
            <Route path="trash" element={<TrashAdmin />} />
            <Route path="*" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Suspense>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/"           element={<Page><Home /></Page>} />
            <Route path="/about"      element={<Page><About /></Page>} />
            <Route path="/tours"      element={<Page><Tours /></Page>} />
            <Route path="/plan"       element={<Page><PlanJourney /></Page>} />
            <Route path="/wishlist"   element={<Page><Wishlist /></Page>} />
            <Route path="/login"      element={<Page><Login /></Page>} />
            <Route path="/register"   element={<Page><Register /></Page>} />
            <Route path="/thank-you"  element={<Page><ThankYou /></Page>} />
            <Route path="/faq"        element={<Page><Faq /></Page>} />
            <Route path="/policies"   element={<Page><Policies /></Page>} />
            <Route path="/guides"     element={<Page><Guides /></Page>} />
            <Route path="/guides/:slug" element={<Page><GuideDetail /></Page>} />
            <Route path="/gallery"    element={<Page><Gallery /></Page>} />
            <Route path="/contact"    element={<Page><Contact /></Page>} />
            <Route path="/tours/region/:region" element={<Page><RegionTourPage /></Page>} />
            {/* /tours/featured is not a real page, it only ever collided with
                /tours/:id and rendered a broken detail view. Redirect to the list. */}
            <Route path="/tours/featured" element={<Navigate to="/tours" replace />} />
            <Route path="/tours/:id"  element={<Page><TourDetails /></Page>} />
            {/* Journal retired -> its slot is now Guides; redirect old links. */}
            <Route path="/blogs"      element={<Navigate to="/guides" replace />} />
            <Route path="/blogs/:id"  element={<Navigate to="/guides" replace />} />
            <Route path="*"           element={<Page><PageNotFound /></Page>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  );
};

export default Router;
