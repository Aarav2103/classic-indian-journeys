import { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../utils/config';

const useFetch = (endpoint, queryParams) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${BASE_URL}/${endpoint}`, {
          params: queryParams,
          signal: controller.signal,
        });
        // Tolerate both response shapes: { data: ... } and a raw object/array.
        setData(response.data?.data ?? response.data);
      } catch (err) {
        if (controller.signal.aborted) return; // stale request, ignore
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [endpoint, queryParams]);

  return { data, error, loading };
};

export default useFetch;
