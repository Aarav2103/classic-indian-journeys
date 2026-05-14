import nodemailer from "nodemailer";

// Optional email notifications. If SMTP isn't configured, every send is a
// no-op (logged once) so the app runs fine locally and notifications can be
// switched on later purely via env vars, no code change. Sends never throw
// and never block the request: notify helpers are fire-and-forget.
//
// Configure in .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
//   MAIL_FROM           e.g. "Classic Indian Journeys <no-reply@cij.com>"
//   ADMIN_NOTIFY_EMAIL  where booking/enquiry/subscriber alerts are sent

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, ADMIN_NOTIFY_EMAIL } = process.env;

const isConfigured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // SSL on 465, STARTTLS otherwise
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  console.info("[mailer] SMTP not configured, email notifications are disabled.");
}

const from = MAIL_FROM || SMTP_USER;

// Low-level send. Resolves to true on success, false otherwise, never throws.
export const sendMail = async ({ to, subject, text, html }) => {
  if (!transporter || !to) return false;
  try {
    await transporter.sendMail({ from, to, subject, text, html });
    return true;
  } catch (err) {
    console.error("[mailer] Failed to send mail:", err.message);
    return false;
  }
};

// Fire-and-forget admin notifications (call without awaiting)

export const notifyNewBooking = (booking) => {
  if (!ADMIN_NOTIFY_EMAIL) return;
  const total = booking.totalInr != null ? `₹${booking.totalInr.toLocaleString("en-IN")}` : "-";
  void sendMail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `New booking: ${booking.tourName}`,
    text:
      `A new booking has been received.\n\n` +
      `Tour: ${booking.tourName}\n` +
      `Name: ${booking.fullName}\n` +
      `Phone: ${booking.phone}\n` +
      `Group size: ${booking.groupSize}\n` +
      `Travel date: ${new Date(booking.bookAt).toDateString()}\n` +
      `Total: ${total}\n`,
  });
};

export const notifyNewEnquiry = (contact) => {
  if (!ADMIN_NOTIFY_EMAIL) return;
  void sendMail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `New enquiry from ${contact.name}`,
    text:
      `A new contact enquiry has been received.\n\n` +
      `Name: ${contact.name}\n` +
      `Email: ${contact.email}\n` +
      `Phone: ${contact.phone}\n\n` +
      `Message:\n${contact.message}\n`,
  });
};

export const notifyNewSubscriber = (email) => {
  if (!ADMIN_NOTIFY_EMAIL) return;
  void sendMail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: "New newsletter subscriber",
    text: `${email} just subscribed to the newsletter.`,
  });
};
