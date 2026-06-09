import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { BASE_URL, AI_TIMEOUT } from "../../utils/config";
import { knowledgeHref } from "../../utils/knowledge";
import { useCurrency } from "../../context/CurrencyContext";
import SafeImage from "../../ui/SafeImage";

// RAG concierge widget. A site-wide floating chat that answers travellers'
// questions, grounded by the backend agent in two paths: Atlas Vector Search over
// our knowledge corpus (FAQs/policies/guides) and the structured catalogue search.
// It shows the SOURCES that grounded each answer and deep-links any journeys it
// surfaces. Full day-by-day itineraries are handed off to the planner (/plan).
//
// Opt-in: probes /tours/ai-status once and renders nothing if AI is unconfigured
// (no wasted LLM call). Owns its own chat state, like PlanJourney.

const STARTERS = [
  "What's your cancellation policy?",
  "When is the best time to see tigers?",
  "Do I need a visa to visit India?",
  "Which South India journeys are under ₹1 lakh?",
];

// Map a knowledge category -> a (subset-safe) icon + short label for citations.
const CATEGORY_META = {
  faq: { icon: "ri-chat-3-line", label: "FAQ" },
  policy: { icon: "ri-quill-pen-line", label: "Policy" },
  "region-guide": { icon: "ri-map-2-line", label: "Guide" },
  guide: { icon: "ri-compass-3-line", label: "Guide" },
  "tour-info": { icon: "ri-map-pin-2-line", label: "Journey" },
  permit: { icon: "ri-shield-star-line", label: "Permit" },
};

let seq = 0;
const newMsg = (m) => ({ id: ++seq, ...m });

// Compact tour row, narrower than ItineraryView's MiniTourCard, sized for the
// ~26rem concierge panel. Whole row links to the tour.
const TourRow = ({ tour, format }) => {
  const { _id, title, city, photo, price, duration } = tour || {};
  return (
    <Link
      to={`/tours/${_id}`}
      className="group ds-card ds-card-hover flex items-stretch overflow-hidden"
    >
      <div className="w-20 shrink-0 self-stretch bg-brand-line overflow-hidden">
        <SafeImage src={photo} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-1">
        <div className="flex flex-wrap items-center gap-x-2 text-[10px] uppercase tracking-[0.1em] text-brand-muted">
          {city && (
            <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
              <i className="ri-map-pin-2-line text-brand-gold shrink-0" />
              <span className="truncate">{city}</span>
            </span>
          )}
          {duration ? (
            <span className="inline-flex items-center gap-1 shrink-0">
              <i className="ri-calendar-line" /> {duration}d
            </span>
          ) : null}
        </div>
        <h4 className="font-heading text-brand-espresso text-sm leading-snug line-clamp-2 group-hover:text-brand-gold-dark transition-colors">
          {title}
        </h4>
        {price > 0 && (
          <p className="font-heading text-brand-espresso text-sm">
            {format(price)}
            <span className="text-[10px] text-brand-muted ml-1 font-body">/ person</span>
          </p>
        )}
      </div>
    </Link>
  );
};

const Concierge = () => {
  const { format } = useCurrency();
  const [available, setAvailable] = useState(null); // null=unknown, false=hide, true=show
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [downed, setDowned] = useState(false); // AI went quiet mid-session

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Probe AI availability once, render nothing if it's off (or backend down).
  useEffect(() => {
    let alive = true;
    axios
      .get(`${BASE_URL}/tours/ai-status`)
      .then((res) => alive && setAvailable(Boolean(res.data?.ai)))
      .catch(() => alive && setAvailable(false));
    return () => {
      alive = false;
    };
  }, []);

  // Keep the conversation pinned to the latest turn.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Focus the composer when the panel opens.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const send = async (raw) => {
    const content = (raw ?? "").trim();
    if (!content || loading || downed) return;

    const history = [...messages, newMsg({ role: "user", content })];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${BASE_URL}/tours/ask`,
        { messages: history.slice(-16).map((m) => ({ role: m.role, content: m.content })) },
        { timeout: AI_TIMEOUT }
      );
      if (res.data?.success) {
        setMessages((cur) => [
          ...cur,
          newMsg({
            role: "assistant",
            content: res.data.reply || "",
            sources: res.data.sources || [],
            tours: res.data.tours || [],
          }),
        ]);
      } else {
        setMessages((cur) => [...cur, newMsg({ role: "assistant", content: "Sorry, I couldn't find that. Could you rephrase?" })]);
      }
    } catch (err) {
      if (err?.response?.status === 503) {
        setDowned(true);
      } else {
        setMessages((cur) => [
          ...cur,
          newMsg({ role: "assistant", content: "I had trouble reaching our desk just now, please try again in a moment." }),
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!available) return null;

  const started = messages.length > 0;

  return (
    <div className="fixed bottom-0 right-0 z-[60] p-4 sm:p-6 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Travel concierge"
            className="mb-3 w-[min(26rem,calc(100vw-2rem))] h-[min(40rem,calc(100dvh-2rem))] flex flex-col overflow-hidden rounded-2xl border border-brand-line bg-brand-cream shadow-2xl shadow-brand-espresso/20"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-brand-line bg-brand-parchment">
              <span className="inline-flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-brand-cream border border-brand-gold/40 flex items-center justify-center text-brand-gold-dark">
                  <i className="ri-sparkling-2-fill" />
                </span>
                <span className="leading-tight">
                  <span className="block font-heading text-brand-espresso text-sm">Travel concierge</span>
                  <span className="block text-[11px] text-brand-muted">Ask about seasons, visas, policy & journeys</span>
                </span>
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close concierge" className="text-brand-muted hover:text-brand-espresso transition-colors p-1">
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            {/* Conversation */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
              {!started && (
                <div className="space-y-4">
                  <div className="flex gap-2.5">
                    <Avatar />
                    <div className="rounded-2xl rounded-bl-md bg-brand-parchment border border-brand-line px-3.5 py-2.5 text-sm leading-relaxed text-brand-espresso">
                      Hello, I'm the studio concierge. Ask me about the best time to travel, what's included, visas,
                      our booking policy, or which journeys fit what you're after.
                    </div>
                  </div>
                  <div className="pl-9 space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Try asking</p>
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="block w-full text-left text-sm text-brand-espresso border border-brand-line hover:border-brand-gold/60 hover:bg-brand-parchment rounded-xl px-3 py-2 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-espresso text-brand-cream px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="space-y-2.5">
                    {m.content && (
                      <div className="flex gap-2.5">
                        <Avatar />
                        <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-brand-parchment border border-brand-line px-3.5 py-2.5 text-sm leading-relaxed text-brand-espresso whitespace-pre-wrap">
                          {m.content}
                        </div>
                      </div>
                    )}

                    {m.sources?.length > 0 && (
                      <div className="pl-9">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-brand-muted mb-1.5">
                          <i className="ri-double-quotes-l mr-1 text-brand-gold-dark" />Grounded in
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {dedupeSources(m.sources).map((s) => {
                            const meta = CATEGORY_META[s.category] || CATEGORY_META.guide;
                            return (
                              <Link
                                key={s.id}
                                to={knowledgeHref(s)}
                                onClick={() => setOpen(false)}
                                title={`Read: ${s.sourceTitle || s.title}`}
                                className="inline-flex items-center gap-1 rounded-full bg-brand-cream border border-brand-line hover:border-brand-gold/60 hover:bg-brand-parchment px-2.5 py-1 text-[11px] text-brand-espresso transition-colors"
                              >
                                <i className={`${meta.icon} text-brand-gold-dark`} />
                                <span className="truncate max-w-[12rem]">{s.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {m.tours?.length > 0 && (
                      <div className="pl-9 space-y-2">
                        {m.tours.map((t) => (
                          <TourRow key={t._id} tour={t} format={format} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}

              {loading && (
                <div className="flex gap-2.5">
                  <Avatar pulse />
                  <div className="rounded-2xl rounded-bl-md bg-brand-parchment border border-brand-line px-3.5 py-2.5 inline-flex items-center gap-2">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-dark animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-dark animate-bounce" style={{ animationDelay: "120ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-dark animate-bounce" style={{ animationDelay: "240ms" }} />
                    </span>
                    <span className="text-xs text-brand-muted">Looking into it...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-brand-line bg-brand-cream px-3 py-3">
              {downed ? (
                <p className="text-xs text-brand-muted text-center py-1.5">
                  The concierge went quiet. You can still{" "}
                  <Link to="/tours" className="text-brand-gold-dark underline">browse our journeys</Link>.
                </p>
              ) : (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send(input);
                    }}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      maxLength={4000}
                      placeholder="Ask the concierge..."
                      className="ds-input resize-none text-sm flex-1 max-h-28 !py-2.5"
                      aria-label="Ask the concierge"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="ds-btn ds-btn-primary shrink-0 !px-3 !py-2.5 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {loading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-2-fill" />}
                    </button>
                  </form>
                  <p className="mt-2 text-center text-[11px] text-brand-muted">
                    Want a full day-by-day plan?{" "}
                    <Link to="/plan" onClick={() => setOpen(false)} className="text-brand-gold-dark hover:underline">
                      Open the planner <i className="ri-route-line" />
                    </Link>
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close concierge" : "Open travel concierge"}
          aria-expanded={open}
          className="group inline-flex items-center gap-2 rounded-full bg-brand-espresso text-brand-cream pl-4 pr-5 py-3 shadow-xl shadow-brand-espresso/25 hover:bg-brand-espresso/90 transition-colors"
        >
          <i className={`text-lg ${open ? "ri-close-line" : "ri-chat-3-line"}`} />
          {!open && <span className="text-sm font-medium hidden sm:inline">Concierge</span>}
        </button>
      </div>
    </div>
  );
};

const Avatar = ({ pulse = false }) => (
  <span className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-brand-parchment border border-brand-gold/40 flex items-center justify-center text-brand-gold-dark">
    <i className={`ri-sparkling-2-fill text-sm ${pulse ? "animate-pulse" : ""}`} />
  </span>
);

// Several retrieved chunks can share a source piece; show distinct chunk titles.
const dedupeSources = (sources) => {
  const seen = new Set();
  const out = [];
  for (const s of sources) {
    const key = s.id || s.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 4) break;
  }
  return out;
};

export default Concierge;
