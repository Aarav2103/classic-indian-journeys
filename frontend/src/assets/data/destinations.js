// Curated destination imagery for the homepage "A glimpse of India" carousel
// (and the Gallery fallback / About page).
//
// These are now served LOCALLY from /public/images/destinations/ rather than
// hot-linked from Unsplash. The external URLs proved unreliable, several 404'd
// and a few served wrong photos (a wedding crowd for "Udaipur", a VW van for
// "Varanasi"), so each image was vetted by eye and downloaded. Sources: Unsplash
// + Wikimedia Commons (see `credit`). To refresh one, replace the file in place.
//
// Each entry: { id, title, region, image, credit }.

const destinations = [
  {
    id: "taj-mahal",
    title: "The Eternal Taj",
    region: "Agra, Uttar Pradesh",
    image: "/images/destinations/taj-mahal.jpg",
    credit: "Sylwia Bartyzel / Unsplash",
  },
  {
    id: "jaipur-palace",
    title: "Pink City Palaces",
    region: "Jaipur, Rajasthan",
    image: "/images/destinations/jaipur-palace.jpg",
    credit: "Unsplash",
  },
  {
    id: "udaipur",
    title: "Lake Palace, Udaipur",
    region: "Udaipur, Rajasthan",
    image: "/images/destinations/udaipur.jpg",
    credit: "Wikimedia Commons",
  },
  {
    id: "kerala-backwaters",
    title: "Kerala Backwaters",
    region: "Alleppey, Kerala",
    image: "/images/destinations/kerala-backwaters.jpg",
    credit: "Sumeet B. / Unsplash",
  },
  {
    id: "varanasi",
    title: "Ghats of Varanasi",
    region: "Varanasi, Uttar Pradesh",
    image: "/images/destinations/varanasi.jpg",
    credit: "Unsplash",
  },
  {
    id: "ladakh",
    title: "Himalayan Ladakh",
    region: "Leh, Ladakh",
    image: "/images/destinations/ladakh.jpg",
    credit: "Unsplash",
  },
  {
    id: "hampi",
    title: "Stone Chariots of Hampi",
    region: "Hampi, Karnataka",
    image: "/images/destinations/hampi.jpg",
    credit: "Wikimedia Commons",
  },
  {
    id: "khajuraho",
    title: "Khajuraho Temples",
    region: "Khajuraho, Madhya Pradesh",
    image: "/images/destinations/khajuraho.jpg",
    credit: "Wikimedia Commons",
  },
  {
    id: "rishikesh",
    title: "Rishikesh & the Ganga",
    region: "Rishikesh, Uttarakhand",
    image: "/images/destinations/rishikesh.jpg",
    credit: "Wikimedia Commons",
  },
  {
    id: "mysore",
    title: "Mysore Palace",
    region: "Mysore, Karnataka",
    image: "/images/destinations/mysore.jpg",
    credit: "Praveen Thirumurugan / Unsplash",
  },
];

export default destinations;
