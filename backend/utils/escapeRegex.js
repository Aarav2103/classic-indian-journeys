// Escape user/model-supplied input before using it inside a RegExp (prevents
// ReDoS / regex injection). Shared by tour region search and AI search.
export const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
