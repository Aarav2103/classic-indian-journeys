import Booking from "../models/Booking.js";
import Tour from "../models/Tour.js";
import { getPagination, listResponse } from "../utils/paginate.js";
import { notifyNewBooking } from "../utils/mailer.js";

// Create a new booking. Identity comes from the authenticated user; the price
// is re-read and snapshotted server-side so the client can't dictate it.
export const createBooking = async (req, res) => {
  try {
    const { tourId, fullName, phone, groupSize, bookAt } = req.body;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }

    const size = Number(groupSize);
    const priceInr = tour.price;
    const totalInr = priceInr * size;

    const newBooking = new Booking({
      user: req.user._id,
      userEmail: req.user.email,
      tour: tour._id,
      tourName: tour.title,
      fullName,
      phone,
      groupSize: size,
      bookAt,
      currency: "INR",
      priceInr,
      totalInr,
    });

    const savedBooking = await newBooking.save();
    notifyNewBooking(savedBooking); // fire-and-forget; never blocks the response
    res.status(201).json({
      success: true,
      message: "Your tour is booked",
      data: savedBooking,
    });
  } catch (error) {
    console.error("Error while creating booking:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    // Only the booking's owner or an admin may view it. Without this, any
    // logged-in user could read every customer's PII by enumerating ids.
    const isOwner = booking.user?.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.status(200).json({ success: true, message: "Booking retrieved successfully", data: booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to get booking" });
  }
};

// Get all bookings (admin), supports opt-in ?page&limit
export const getAllBookings = async (req, res) => {
  try {
    const pg = getPagination(req);
    let query = Booking.find().sort({ createdAt: -1 });
    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    const bookings = await query;
    const total = pg ? await Booking.countDocuments() : bookings.length;
    res.status(200).json(listResponse(bookings, pg, total));
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to get bookings" });
  }
};

// Delete a booking (admin), SOFT delete (restorable from Trash).
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    await booking.softDelete();
    res.status(200).json({ success: true, message: "Booking moved to Trash" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete booking" });
  }
};

export default { createBooking, getBooking, getAllBookings, deleteBooking };
