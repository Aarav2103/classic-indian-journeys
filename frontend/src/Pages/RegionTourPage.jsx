import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from "../utils/config";
import TourCard from '../Shared/TourCard';

const RegionTourPage = () => {
  const { region } = useParams();    // e.g. "central-india"
  const [tours, setTours] = useState([]);
  const [error, setError] = useState(false);

useEffect(() => {
  async function fetchTours() {
    const url = `${BASE_URL}/tours/region/${region}`;
    console.log("➡️ about to fetch URL:", url);

    try {
      const res = await axios.get(url);
      setTours(res.data.data);
    } catch (err) {
      console.error("Fetch failed:", err);
      setError(true);
    }
  }
  fetchTours();
}, [region]);


  if (error) return (
    <h2 className="text-center mt-20 text-red-600 font-semibold">
      Oops! Unable to load the tour details. Kindly check your connection.
    </h2>
  );

  if (!tours.length) return (
    <h2 className="text-center mt-20 text-gray-500">
      No tours found for {region.replace(/-/g, ' ')}.
    </h2>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 capitalize">
        Tours in {region.replace(/-/g, ' ')}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map(t => <TourCard key={t._id} tour={t} />)}
      </div>
    </div>
  );
};

export default RegionTourPage;
