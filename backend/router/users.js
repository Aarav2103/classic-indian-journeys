import express from "express";
import { z } from "zod";
import { validateBody } from "../utils/validate.js";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserPassword,
  updateUserRole,
  deleteUser,
} from "../controllers/userController.js";
import verifyToken, {
  verifyAdmin,
  verifyOwnerOrAdmin,
} from "../utils/verifyToken.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { publicWriteLimiter } from "../utils/rateLimiters.js";

const userRoute = express.Router();

const createUserSchema = z.object({
  username: z.string().min(2).max(40),
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
  photo: z.string().max(2000).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(2).max(40).optional(),
  email: z.string().email().max(200).optional(),
  photo: z.string().max(2000).optional(),
});

const updatePasswordSchema = z.object({
  // Required when changing your own password; ignored for admin resets.
  currentPassword: z.string().min(1).max(200).optional(),
  newPassword: z.string().min(6).max(200),
});

// Admin
userRoute.post("/", verifyToken, verifyAdmin, validateBody(createUserSchema), createUser);
userRoute.get("/", verifyToken, verifyAdmin, getAllUsers);
userRoute.patch("/:id/role", verifyToken, verifyAdmin, validateObjectId("id"), updateUserRole);

// Owner or admin
userRoute.get("/:id", verifyToken, verifyOwnerOrAdmin, validateObjectId("id"), getUserById);
userRoute.put("/:id", verifyToken, verifyOwnerOrAdmin, validateObjectId("id"), validateBody(updateUserSchema), updateUser);
userRoute.put("/:id/password", publicWriteLimiter, verifyToken, verifyOwnerOrAdmin, validateObjectId("id"), validateBody(updatePasswordSchema), updateUserPassword);
userRoute.delete("/:id", verifyToken, verifyOwnerOrAdmin, validateObjectId("id"), deleteUser);

export default userRoute;
