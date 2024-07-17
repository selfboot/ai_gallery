import React from "react";
import PropTypes from 'prop-types';

const SEO = ({ title, description, keywords, canonicalUrl }) => {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={`${description}`} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      {/* You can add more meta tags here */}
    </>
  );
};

SEO.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  keywords: PropTypes.string,
  canonicalUrl: PropTypes.string,
};

export default SEO;