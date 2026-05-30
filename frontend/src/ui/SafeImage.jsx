import React, { useState } from "react";

/**
 * SafeImage, gracefully falls back to a neutral placeholder
 * if the source 404s. Use this in place of <img> anywhere the
 * src is dynamic (CDN / user-uploaded / data-driven).
 */
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0%" stop-color="#efe5cf"/>
           <stop offset="100%" stop-color="#d8c79a"/>
         </linearGradient>
       </defs>
       <rect width="800" height="600" fill="url(#g)"/>
       <g fill="#a37f2e" font-family="Playfair Display, Georgia, serif" font-size="34" text-anchor="middle">
         <text x="400" y="305">Classic Indian Journeys</text>
       </g>
     </svg>`
  );

const SafeImage = ({
  src,
  alt = "",
  className = "",
  fallback = PLACEHOLDER,
  loading = "lazy",
  decoding = "async",
  ...rest
}) => {
  const [errored, setErrored] = useState(false);
  const finalSrc = !src || errored ? fallback : src;

  return (
    <img
      src={finalSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={() => setErrored(true)}
      className={className}
      {...rest}
    />
  );
};

export default SafeImage;
