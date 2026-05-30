import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/config";
import PageHero from "../ui/PageHero";
import { Input, Textarea } from "../ui/Input";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import Eyebrow from "../ui/Eyebrow";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${BASE_URL}/contact`, formData);
      setStatus({ type: "success", msg: "Thank you, we'll be in touch within a working day." });
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch {
      setStatus({ type: "error", msg: "Submission failed. Please try again, or email us directly." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Tell us what kind of India you want to see."
        lead="A short note is enough to start. We'll come back to you within one working day, with questions of our own."
      />

      <section className="bg-brand-parchment ds-section">
        <div className="ds-container">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-5 space-y-8">
              <div>
                <Eyebrow>Where we are</Eyebrow>
                <h2 className="ds-h3 mt-3">India-based, always reachable.</h2>
                <p className="ds-body mt-4 text-brand-muted">
                  We work India hours but reply same-day across most time zones.
                  Prefer voice? Tell us a window in your reply and we'll call.
                </p>
              </div>

              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center shrink-0">
                    <i className="ri-mail-line text-xl" />
                  </div>
                  <div>
                    <p className="ds-caption">Email</p>
                    <a className="ds-anchor" href="mailto:contact@classicindianjourneys.example">
                      contact@classicindianjourneys.example
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center shrink-0">
                    <i className="ri-phone-line text-xl" />
                  </div>
                  <div>
                    <p className="ds-caption">Phone / WhatsApp</p>
                    <p className="text-brand-ink">+91, coming soon</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center shrink-0">
                    <i className="ri-map-pin-2-line text-xl" />
                  </div>
                  <div>
                    <p className="ds-caption">Office</p>
                    <p className="text-brand-ink">New Delhi, India</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7">
              <form onSubmit={handleSubmit} className="ds-card p-7 md:p-10 space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <Input
                    label="Full name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Input
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 ..."
                />
                <Textarea
                  label="Tell us about the trip you have in mind"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Dates, party size, the kind of India you want to see..."
                  required
                />

                {status && (
                  <Alert
                    tone={status.type === "success" ? "success" : "error"}
                    onClose={() => setStatus(null)}
                  >
                    {status.msg}
                  </Alert>
                )}

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="lg" disabled={submitting}>
                    {submitting ? "Sending..." : "Send enquiry"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
