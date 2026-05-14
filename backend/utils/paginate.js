// Opt-in pagination. If the request has no `page` query param, returns null and
// the caller returns the full list (backward compatible). If `page` is present,
// returns { page, limit, skip } so the caller can paginate.
export const getPagination = (req, defaultLimit = 20, maxLimit = 100) => {
  const page = parseInt(req.query.page, 10);
  if (!page || page < 1) return null;
  const limit = Math.min(parseInt(req.query.limit, 10) || defaultLimit, maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// Builds the standard list response envelope.
export const listResponse = (data, pg, total) => ({
  success: true,
  count: data.length,
  total,
  page: pg ? pg.page : 1,
  pages: pg ? Math.ceil(total / pg.limit) : 1,
  data,
});
