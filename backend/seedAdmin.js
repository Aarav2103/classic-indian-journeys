// seedAdmin.js
// One-off script to create or promote an admin user.
//
//   1. Put these in backend/.env:
//        ADMIN_EMAIL=you@example.com
//        ADMIN_PASSWORD=a-strong-password
//        ADMIN_USERNAME=admin            (optional, used only when creating)
//   2. Run:  npm run seed:admin   (from the backend/ folder)
//
// If a user with ADMIN_EMAIL already exists, they are promoted to admin and
// their password is reset to ADMIN_PASSWORD. Otherwise a new admin is created.

import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";

dotenv.config();

const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";

async function run() {
  if (!MONGO_URI) {
    console.error("[seedAdmin] MONGO_URI is missing in .env");
    process.exit(1);
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "[seedAdmin] Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env, then re-run."
    );
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    existing.role = "admin";
    existing.password = hashed;
    await existing.save();
    console.log(`[seedAdmin] Promoted ${ADMIN_EMAIL} to admin and reset password.`);
  } else {
    await User.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashed,
      role: "admin",
    });
    console.log(`[seedAdmin] Created admin ${ADMIN_EMAIL} (username: ${ADMIN_USERNAME}).`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("[seedAdmin] Failed:", err);
  process.exit(1);
});
