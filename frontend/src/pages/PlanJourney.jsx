import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

import Eyebrow from "../ui/Eyebrow";
import GoldRule from "../ui/GoldRule";
import Button from "../ui/Button";
import ItineraryView from "../components/ai/ItineraryView";
import { BASE_URL, AI_TIMEOUT } from "../utils/config";

// Conversational planner: one ongoing chat with the agent. It clarifies, drafts
// a grounded day-by-day itinerary from real tours, and refines it across turns
// ("make it cheaper", "add a few days in Goa"). State lives here; each turn we
// send the short message history + the itinerary currently on screen.

const EXAMPLES = [
  "A relaxed 12-day first trip to India for two, forts and food in Rajasthan, then slow days in the Kerala backwaters",
  "Plan a 10-day Rajasthan honeymoon under ₹2.5 lakh each",
  "We're a family of four with kids, wildlife and a bit of beach, about two weeks",
  "Something spiritual and unhurried across the south, 9 nights",
];

let msgSeq = 0;
const newMsg = (m) => ({ id: ++msgSeq, ...m });

// The latest itinerary on screen, what a refinement should act on.
const currentItinerary = (messages) => {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].itinerary) return messages[i].itinerary;
  return null;
};
const lastItineraryId = (messages) => {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].itinerary) return messages[i].id;
  return null;
};
const lastUserMessageId = (messages) => {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") return messages[i].id;
  return null;
};

const PlanJourney = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const turnTopRef = useRef(null);
  const seededRef = useRef(false);

  const started = messages.length > 0;
  const hasPlan = messages.some((m) => m.itinerary);

  // When a NEW user turn lands, bring it to the top of the scroll area so the
  // reply renders below it (read top-down), not snapped past, near the footer.
  // When the assistant turn arrives we leave the scroll alone.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "user") {
      turnTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages]);

  const send = async (raw) => {
    const content = (raw ?? "").trim();
    if (!content || loading || unavailable) return;

    const history = [...messages, newMsg({ role: "user", content })];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${BASE_URL}/tours/plan/chat`,
        {
          messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          itinerary: currentItinerary(messages),
        },
        { timeout: AI_TIMEOUT }
      );
      if (res.data?.success) {
        setMessages((cur) => [
          ...cur,
          newMsg({
            role: "assistant",
            content: res.data.reply || "",
            itinerary: res.data.itinerary || null,
            tours: res.data.tours || [],
          }),
        ]);
      } else {
        setMessages((cur) => [...cur, newMsg({ role: "assistant", content: "Sorry, I couldn't shape that. Could you rephrase?" })]);
      }
    } catch (err) {
      if (err?.response?.status === 503) {
        setUnavailable(true);
      } else {
        setMessages((cur) => [
          ...cur,
          newMsg({ role: "assistant", content: "I had trouble reaching the planner just now, give it another try in a moment." }),
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Seed the conversation on arrival. Two ways in:
  //  1. Router state {plan:{query,itinerary,tours}}, handed off from the Tours
  //     smart box. We show that EXACT plan as the first assistant turn (no
  //     re-planning), then clear the state so a refresh doesn't reseed it.
  //  2. ?q=, a plain deep-link; we run it fresh through the planner.
  useEffect(() => {
    if (seededRef.current) return;
    const carried = location.state?.plan;
    if (carried?.itinerary) {
      seededRef.current = true;
      setMessages([
        newMsg({ role: "user", content: carried.query || "Plan my India trip" }),
        newMsg({
          role: "assistant",
          content: carried.itinerary.summary || "Here's the itinerary we drafted, tell me how you'd like to shape it.",
          itinerary: carried.itinerary,
          tours: carried.tours || [],
        }),
      ]);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    const q = searchParams.get("q");
    if (q && q.trim()) {
      seededRef.current = true;
      send(q.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const reset = () => {
    setMessages([]);
    setInput("");
    setUnavailable(false);
  };

  const lastItinId = lastItineraryId(messages);
  const lastUserId = lastUserMessageId(messages);

  // The composer (shared by the empty-state card and the active-chat shell).
  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(input);
      }}
      className="flex items-end gap-3"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onComposerKeyDown}
        rows={1}
        maxLength={4000}
        placeholder={hasPlan ? "Refine it, cheaper, longer, swap a city, add a region..." : "Tell the planner more..."}
        className="ds-input resize-none text-base flex-1 max-h-32"
        aria-label="Message the planner"
      />
      <button
        type="submit"
        disabled={!input.trim() || loading}
        className={`ds-btn ds-btn-primary ds-btn-lg shrink-0 disabled:pointer-events-none ${loading ? "" : "disabled:opacity-30"}`}
      >
        {loading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-2-fill" />}
        <span className="hidden sm:inline ml-1">{loading ? "Sending" : "Send"}</span>
      </button>
    </form>
  );

  // Empty state: hero + starter (scrolls within the surface)
  if (!started) {
    return (
      <section className="bg-brand-cream h-full overflow-y-auto">
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgb(var(--brand-gold-rgb)) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
            aria-hidden="true"
          />
          <div className="relative ds-container pt-20 md:pt-28 pb-10 text-center">
            <Eyebrow>Plan my journey</Eyebrow>
            <h1 className="ds-h1 mt-4 text-balance">Describe your trip. Then talk it into shape.</h1>
            <GoldRule />
            <p className="ds-lead max-w-2xl mx-auto">
              Tell our AI planner what you're dreaming of, and it drafts a day-by-day route from journeys we
              actually run. Then just chat, make it cheaper, longer, add a region, until it's yours.
            </p>
          </div>
        </div>

        <div className="ds-container max-w-3xl w-full pb-20">
          <div className="ds-card p-6 md:p-8">
            <label htmlFor="trip-text" className="ds-h4 block mb-3">
              What's your dream India trip?
            </label>
            <textarea
              id="trip-text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onComposerKeyDown}
              rows={3}
              maxLength={4000}
              placeholder="e.g. a slow 12-day first trip for two, forts and food in Rajasthan, then the Kerala backwaters"
              className="ds-input resize-none text-base"
              autoFocus
            />

            <div className="mt-4">
              <p className="ds-eyebrow mb-2.5">Or start from one of these</p>
              <div className="flex flex-col gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => send(ex)}
                    className="text-left text-sm text-brand-espresso border border-brand-line hover:border-brand-gold/60 hover:bg-brand-parchment rounded-xl px-4 py-2.5 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {unavailable && (
              <p className="mt-5 ds-small text-brand-muted">
                The AI planner isn't available right now. You can still{" "}
                <Link to="/tours" className="text-brand-gold-dark underline">browse our journeys</Link>.
              </p>
            )}

            <div className="mt-7 flex items-center justify-between gap-4">
              <p className="ds-small text-brand-muted">A starting point, not a quote, re-shaped with you after.</p>
              <button
                type="button"
                onClick={() => send(input)}
                disabled={!input.trim() || unavailable}
                className="ds-btn ds-btn-primary ds-btn-lg disabled:opacity-30 disabled:pointer-events-none"
              >
                <i className="ri-sparkling-2-line" /> Start planning
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Active chat: fills the surface; only the message list scrolls
  // The page surface (set in Layout) is exactly viewport-minus-header with the
  // document locked, so there's a single scroll here, the message list, with a
  // static bar on top and the composer pinned at the bottom.
  return (
    <section className="bg-brand-cream flex flex-col h-full overflow-hidden">
      {/* Bar */}
      <div className="shrink-0 border-b border-brand-line bg-brand-cream">
        <div className="ds-container max-w-3xl py-4 flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-brand-gold-dark">
            <i className="ri-sparkling-2-fill" /> AI trip planner
          </span>
          <button type="button" onClick={reset} className="ds-btn ds-btn-link text-sm">
            <i className="ri-restart-line mr-1" /> Start over
          </button>
        </div>
      </div>

      {/* Scrollable conversation, the only scroll on this surface */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="ds-container max-w-3xl py-6 space-y-5">
          {messages.map((m) =>
            m.role === "user" ? (
              <div
                key={m.id}
                ref={m.id === lastUserId ? turnTopRef : undefined}
                className="flex justify-end scroll-mt-4"
              >
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-espresso text-brand-cream px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="space-y-4">
                {m.content && (
                  <div className="flex gap-3">
                    <span className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-brand-parchment border border-brand-gold/40 flex items-center justify-center text-brand-gold-dark">
                      <i className="ri-sparkling-2-fill text-sm" />
                    </span>
                    <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-brand-parchment border border-brand-line px-4 py-3 text-sm leading-relaxed text-brand-espresso whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                )}
                {m.itinerary && (
                  <div className="ds-card p-6 md:p-8">
                    <ItineraryView
                      itinerary={m.itinerary}
                      tours={m.tours || []}
                      onRefine={m.id === lastItinId ? send : undefined}
                      refining={m.id === lastItinId && loading}
                    />
                  </div>
                )}
              </div>
            )
          )}

          {/* Thinking */}
          {loading && (
            <div className="flex gap-3">
              <span className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-brand-parchment border border-brand-gold/40 flex items-center justify-center text-brand-gold-dark">
                <i className="ri-sparkling-2-fill text-sm animate-pulse" />
              </span>
              <div className="rounded-2xl rounded-bl-md bg-brand-parchment border border-brand-line px-4 py-3 inline-flex items-center gap-2.5">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-dark animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-dark animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-dark animate-bounce" style={{ animationDelay: "240ms" }} />
                </span>
                <span className="ds-small text-brand-muted">{hasPlan ? "Reworking your plan..." : "Planning your journey..."}</span>
              </div>
            </div>
          )}

          {/* Hand-off CTA: once there's a real plan */}
          {hasPlan && !loading && (
            <div className="ds-card p-8 md:p-10 text-center !mt-12">
              <Eyebrow>Take it to a real person</Eyebrow>
              <h3 className="ds-h3 mt-3 text-balance">We'll reply within a working day, every time.</h3>
              <p className="ds-body mt-4 max-w-xl mx-auto text-brand-muted">
                Send this over, or just the bits you like. A founder will pick it up with notes, options and
                questions of our own.
              </p>
              <div className="mt-7 flex flex-wrap gap-4 justify-center">
                <Button to="/contact" variant="primary" size="lg">Send this to our team</Button>
                <Link to="/tours" className="ds-btn ds-btn-link">Browse fixed itineraries instead</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer, static bottom row of the shell */}
      <div className="shrink-0 border-t border-brand-line bg-brand-cream">
        <div className="ds-container max-w-3xl py-4">
          {unavailable ? (
            <p className="ds-small text-brand-muted text-center">
              The planner went quiet. You can still{" "}
              <Link to="/tours" className="text-brand-gold-dark underline">browse our journeys</Link>.
            </p>
          ) : (
            composer
          )}
        </div>
      </div>
    </section>
  );
};

export default PlanJourney;
