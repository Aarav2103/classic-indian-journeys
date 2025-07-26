import React, { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import Subtitle from "../Shared/Subtitle";
import { BASE_URL } from "../utils/config";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [alert, setAlert] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BASE_URL}/contact`, formData);
      setAlert({ type: "success", msg: "Message sent successfully!" });
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setAlert({ type: "error", msg: "Submission failed. Try again." });
    }
  };

  return (
    <section className="bg-[#fdf6e8] py-16 px-4">
      <div className="max-w-4xl mx-auto rounded-3xl border border-[#e0d1b3] bg-white/70 backdrop-blur-lg p-10 shadow-md">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <Subtitle subtitle="Get in Touch" />
          <p className="text-[#5a3f28] text-base">
            We'd love to hear from you – whether you're planning a journey or dreaming of one.
          </p>
        </motion.div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <input
            type="text"
            name="name"
            value={formData.name}
            placeholder="Full Name"
            onChange={handleChange}
            className="px-4 py-3 rounded-full bg-[#fdfaf5] border border-[#d4af37] text-sm placeholder:text-[#a08458] focus:outline-none focus:ring-2 focus:ring-[#c89e36]"
            required
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            placeholder="Email Address"
            onChange={handleChange}
            className="px-4 py-3 rounded-full bg-[#fdfaf5] border border-[#d4af37] text-sm placeholder:text-[#a08458] focus:outline-none focus:ring-2 focus:ring-[#c89e36]"
            required
          />
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            placeholder="Phone Number"
            onChange={handleChange}
            className="px-4 py-3 rounded-full bg-[#fdfaf5] border border-[#d4af37] text-sm placeholder:text-[#a08458] focus:outline-none focus:ring-2 focus:ring-[#c89e36] md:col-span-2"
            required
          />
          <textarea
            name="message"
            value={formData.message}
            placeholder="Write your message..."
            onChange={handleChange}
            rows="4"
            className="px-4 py-3 rounded-xl bg-[#fdfaf5] border border-[#d4af37] text-sm placeholder:text-[#a08458] focus:outline-none focus:ring-2 focus:ring-[#c89e36] md:col-span-2"
            required
          ></textarea>

          <button
            type="submit"
            className="w-full md:col-span-2 py-3 bg-[#d4af37] text-white font-semibold rounded-full hover:bg-[#b89930] transition"
          >
            Submit
          </button>
        </form>

        {alert && (
          <div
            className={`mt-6 text-center py-2 rounded-full font-medium ${
              alert.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {alert.msg}
          </div>
        )}

        <div className="mt-10 text-center text-[#7a5e32] text-sm leading-relaxed">
          <p>📞 +91 98765 43210</p>
          <p>✉️ contact@classicindianjourneys.com</p>
        </div>
      </div>
    </section>
  );
};

export default Contact;
