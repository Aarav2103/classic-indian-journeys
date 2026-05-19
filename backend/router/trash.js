import express from "express";
import { listTrash, restoreTrash, purgeTrash } from "../controllers/trashController.js";
import verifyToken, { verifyAdmin } from "../utils/verifyToken.js";
import { validateObjectId } from "../utils/validateObjectId.js";

// Admin-only recovery surface for soft-deleted records (see utils/softDelete.js).
const trashRoute = express.Router();

trashRoute.use(verifyToken, verifyAdmin);

trashRoute.get("/", listTrash);
trashRoute.patch("/:type/:id/restore", validateObjectId("id"), restoreTrash);
trashRoute.delete("/:type/:id", validateObjectId("id"), purgeTrash);

export default trashRoute;
