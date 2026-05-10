import mongoose from "mongoose";

// Reject a malformed id route param early with a clean 400, instead of letting
// an invalid value reach Mongoose and surface as a generic 500 (CastError).
// Usage: router.get("/:id", validateObjectId("id"), handler)
export const validateObjectId = (param = "id") => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) {
    return res.status(400).json({ success: false, message: `Invalid ${param}` });
  }
  next();
};

export default validateObjectId;
