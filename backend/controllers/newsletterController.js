import Newsletter from "../models/Newsletter.js";
import { getPagination, listResponse } from "../utils/paginate.js";
import { notifyNewSubscriber } from "../utils/mailer.js";

// Public: subscribe an email. Idempotent, re-subscribing is a no-op success.
export const subscribe = async (req, res) => {
  const { email } = req.body;
  const normalized = email.toLowerCase().trim();
  try {
    const result = await Newsletter.updateOne(
      { email: normalized },
      { $setOnInsert: { email: normalized } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) notifyNewSubscriber(normalized); // only on a new signup
    res.status(201).json({ success: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to subscribe" });
  }
};

// Admin: list subscribers, supports opt-in ?page&limit
export const getSubscribers = async (req, res) => {
  try {
    const pg = getPagination(req);
    let query = Newsletter.find().sort({ createdAt: -1 });
    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    const subs = await query;
    const total = pg ? await Newsletter.countDocuments() : subs.length;
    res.status(200).json(listResponse(subs, pg, total));
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to get subscribers" });
  }
};
