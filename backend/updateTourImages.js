// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import axios from 'axios';

// 🔧 Replace with your actual connection string
const MONGODB_URI = process.env.MONGO_URI;

// 🔑 Replace with your Unsplash API Access Key
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Define your schema (minimal)
const tourSchema = new mongoose.Schema({
  title: String,
  photo: String,
}, { strict: false });

const Tour = mongoose.model("Tour", tourSchema, "tours"); // use 'tours' collection

// Fetch image from Unsplash using the title
async function fetchImageUrl(query) {
  try {
    const res = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query,
        per_page: 1,
        orientation: "landscape"
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    const url = res.data.results[0]?.urls?.regular || null;
    return url;
  } catch (err) {
    console.error(`❌ Error fetching image for "${query}":`, err.message);
    return null;
  }
}

// Update photo field for each tour
async function updateTourImages() {
  const tours = await Tour.find();

  for (let tour of tours) {
    const imgUrl = await fetchImageUrl(tour.title);
    if (!imgUrl) {
      console.log(`⚠️ No image found for ${tour.title}`);
      continue;
    }

    tour.photo = imgUrl;
    await tour.save();
    console.log(`✅ Updated: ${tour.title}`);
  }

  mongoose.connection.close();
}

updateTourImages();
