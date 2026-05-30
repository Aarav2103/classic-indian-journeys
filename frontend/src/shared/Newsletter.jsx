import React, { useState } from "react";
import api from "../api/client";
import Button from "../ui/Button";
import { Input } from "../ui/Input";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // 'done' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await api.post("/newsletter", { email });
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="bg-brand-deep text-brand-on-deep">
      <div className="ds-container py-16 md:py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-gold mb-4">
              Stay in the circle
            </p>
            <h2 className="ds-h2 !text-brand-on-deep max-w-xl text-balance">
              Slow, considered travel notes, once a month, never more.
            </h2>
            <p className="mt-4 text-brand-on-deep/75 max-w-xl leading-relaxed">
              Route notes, heritage hotel openings, and a quiet recommendation
              from the team. Unsubscribe in one click.
            </p>
          </div>

          <div className="lg:col-span-5">
            {status === "done" ? (
              <p className="rounded-md border border-brand-gold/40 bg-brand-gold/10 px-5 py-4 text-sm text-brand-on-deep">
                Thank you, you'll hear from us at the next new moon.
              </p>
            ) : (
              <div>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="!bg-brand-on-deep/10 !border-brand-on-deep/25 !text-brand-on-deep placeholder:!text-brand-on-deep/50"
                    aria-label="Email address"
                  />
                  <Button variant="secondary" type="submit" className="shrink-0">
                    Subscribe
                  </Button>
                </form>
                {status === "error" && (
                  <p className="mt-3 text-sm text-brand-gold-light">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
