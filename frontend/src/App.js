import "./App.css";
import Layout from "./Components/Layout/Layout";
import "aos/dist/aos.css";
import AOS from "aos";
import { useEffect } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


function App() {
  useEffect(() => {
    AOS.init({ duration: 1200, once: true });
  }, []);

  return <Layout />;
}

export default App;
