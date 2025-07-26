import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages
import Home from '../Pages/Home';
import About from '../Pages/About';
import Tours from '../Pages/Tours';
import TourDetails from '../Pages/TourDetails';
import RegionTourPage from '../Pages/RegionTourPage';
import Login from '../Pages/Login';
import Register from '../Pages/Register';
import ThankYou from '../Pages/ThankYou';
import SearchResultList from '../Pages/SearchResultList';
import Gallery from '../Pages/Gallery';
import Contact from '../Pages/Contact';
import Blogs from '../Pages/Blogs';
import BlogDetails from '../Pages/BlogDetails';
import PageNotFound from '../Pages/PageNotFound';

// Shared / Utilities
import FAQ from '../Shared/FAQ';
import ScrollToTop from '../utils/scrolltoTop';

const Router = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Static Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/tours" element={<Tours />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/search" element={<SearchResultList />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/blogs" element={<Blogs />} />

        {/* Dynamic Routes */}
-       <Route path="/tours/region/:region" element={<RegionTourPage />} />
+       <Route path="/tours/region/:region" element={<RegionTourPage />} /> 
+       {/* ^ This handles the region-based tour pages */}

        <Route path="/tours/:id" element={<TourDetails />} />
        <Route path="/blogs/:id" element={<BlogDetails />} />

        {/* Catch-All */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

export default Router;
