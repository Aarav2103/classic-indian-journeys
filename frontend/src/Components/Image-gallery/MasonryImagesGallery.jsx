import React from 'react';
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import galleryImages from './galleryImage';
import './GlimpsesGallery.css';

const MasonryImagesGallery = () => {
  return (
    <section className="glimpses__wrapper">
      <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 768: 2, 992: 3 }}>
        <Masonry gutter="1.2rem">
          {galleryImages.map((items, index) => (
            <div className="glimpse__card" key={index} data-aos="zoom-in">
              <img
                src={items}
                className='masonry__img'
                alt="gallery"
              />
            </div>
          ))}
        </Masonry>
      </ResponsiveMasonry>
    </section>
  );
}

export default MasonryImagesGallery;
