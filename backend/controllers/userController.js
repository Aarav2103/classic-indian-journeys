import bcrypt from "bcrypt";
import User from "../models/User.js";
import { getPagination, listResponse } from "../utils/paginate.js";

// Fields a user (or admin) may change via the generic update endpoint.
// Never role or password here, those have dedicated, guarded paths.
const UPDATABLE_FIELDS = ["username", "email", "photo"];

// Create a new user (admin only). Hashes the password like /auth/register does.
export const createUser = async (req, res) => {
  try {
    const { username, email, password, photo, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "username, email and password are required",
      });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Email or username already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      photo,
      password: hashedPassword,
      role: role === "admin" ? "admin" : "user",
    });
    const savedUser = await newUser.save();

    const safe = savedUser.toObject();
    delete safe.password;
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: safe,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const pg = getPagination(req);
    let query = User.find().select("-password").sort({ createdAt: -1 });
    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    const users = await query;
    const total = pg ? await User.countDocuments() : users.length;
    res.status(200).json(listResponse(users, pg, total));
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to get users" });
  }
};

// Get a single user by ID (owner or admin)
export const getUserById = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to get user" });
  }
};

// Update a user (owner or admin), whitelisted profile fields only.
export const updateUser = async (req, res) => {
  const userId = req.params.id;
  try {
    const update = {};
    for (const key of UPDATABLE_FIELDS) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

// Change a user's password (owner or admin). The owner must prove the current
// password; an admin may set a new one directly, the recovery path for
// forgotten passwords, since there is no email-based reset at this scope.
export const updateUserPassword = async (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (req.user._id.toString() === userId) {
      const ok = await bcrypt.compare(currentPassword || "", user.password);
      if (!ok) {
        return res
          .status(403)
          .json({ success: false, message: "Current password is incorrect" });
      }
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update password" });
  }
};

// Change a user's role (admin only). Admins cannot demote themselves, so a
// project never ends up with zero admins by accident.
export const updateUserRole = async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    return res
      .status(400)
      .json({ success: false, message: "role must be 'user' or 'admin'" });
  }
  if (req.user._id.toString() === userId && role !== "admin") {
    return res
      .status(400)
      .json({ success: false, message: "You cannot remove your own admin access" });
  }

  try {
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { new: true }
    ).select("-password");
    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "Role updated", data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
};

// Delete a user (owner or admin). Admins cannot delete their own account.
export const deleteUser = async (req, res) => {
  const userId = req.params.id;
  if (req.user._id.toString() === userId && req.user.role === "admin") {
    return res
      .status(400)
      .json({ success: false, message: "You cannot delete your own admin account" });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    await user.softDelete(); // SOFT delete (restorable from Trash)
    res.status(200).json({ success: true, message: "User moved to Trash" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

export default {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserPassword,
  updateUserRole,
  deleteUser,
};
