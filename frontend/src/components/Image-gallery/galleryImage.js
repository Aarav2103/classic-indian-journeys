import destinations from "../../assets/data/destinations";

const galleryImages = destinations.map((d) => ({
  src: d.image,
  title: `${d.title}: ${d.region}`,
}));

export default galleryImages;
