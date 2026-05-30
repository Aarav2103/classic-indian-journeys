// Admin API helpers. Each returns the meaningful payload (normalising the
// backend's two response shapes: raw arrays/objects vs { success, data }).
import api from "./client";

const asArray = (r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []);
const asItem = (r) => (r.data?.data !== undefined ? r.data.data : r.data);

/* Tours */
export const fetchTours = () => api.get("/tours").then(asArray);
export const fetchTour = (id) => api.get(`/tours/${id}`).then(asItem);
export const createTour = (body) => api.post("/tours", body).then(asItem);
export const updateTour = (id, body) => api.put(`/tours/${id}`, body).then(asItem);
export const deleteTour = (id) => api.delete(`/tours/${id}`);
export const fetchTourCount = () =>
  api.get("/tours/count").then((r) => r.data?.data ?? 0);

/* Bookings */
export const fetchBookings = () => api.get("/booking").then(asArray);
export const deleteBooking = (id) => api.delete(`/booking/${id}`);

/* Enquiries (contact) */
export const fetchEnquiries = () => api.get("/contact").then(asArray);
export const deleteEnquiry = (id) => api.delete(`/contact/${id}`);

/* Users */
export const fetchUsers = () => api.get("/users").then(asArray);
export const setUserRole = (id, role) =>
  api.patch(`/users/${id}/role`, { role }).then(asItem);
export const deleteUser = (id) => api.delete(`/users/${id}`);

/* Moderation */
export const fetchReviews = () => api.get("/review").then(asArray);
export const deleteReview = (id) => api.delete(`/review/${id}`);

/* Knowledge (FAQs / Guides / Policies) */
export const fetchKnowledge = () => api.get("/knowledge").then(asArray);
export const createKnowledge = (body) => api.post("/knowledge", body).then(asItem);
export const updateKnowledge = (id, body) => api.put(`/knowledge/${id}`, body).then(asItem);
export const deleteKnowledge = (id) => api.delete(`/knowledge/${id}`);
// Repair chunks whose stored vector drifted from their text (embedding failed /
// AI was off on a prior save). Re-embeds existing text only; never regenerates.
export const reembedStaleKnowledge = () => api.post("/knowledge/reembed-stale").then(asItem);

/* Trash (soft-deleted records) */
export const fetchTrash = () => api.get("/trash").then((r) => r.data);
export const restoreTrash = (type, id) => api.patch(`/trash/${type}/${id}/restore`);
export const purgeTrash = (type, id) => api.delete(`/trash/${type}/${id}`);
