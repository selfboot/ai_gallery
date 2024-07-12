import React from "react";
import { Helmet } from "react-helmet";
import PropTypes from 'prop-types'; 

const SEO = ({ title, description, keywords, canonicalUrl }) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description + " This game is written by react, with the help of claude3.5 and gpt4"} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      {/* 你可以在这里添加更多的 meta 标签 */}
    </Helmet>
  );
};

SEO.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  keywords: PropTypes.string,
  canonicalUrl: PropTypes.string,
};

export default SEO;
