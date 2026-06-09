import { useCallback, useEffect, useState } from "react";

/**
 * Small data-fetching helper for admin pages.
 * Pass a STABLE fetcher (a module-level api function) so the effect runs once.
 *   const { data, loading, error, reload } = useResource(fetchTours);
 */
export default function useResource(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.resolve(run())
      .then((d) => setData(d))
      .catch((e) =>
        setError(
          e?.response?.data?.message || e?.message || "Something went wrong."
        )
      )
      .finally(() => setLoading(false));
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
