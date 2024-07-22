const fs = require("fs");
const path = require("path");
const pageMetadata = JSON.parse(fs.readFileSync(path.join(__dirname, "page-metadata.json"), "utf8"));

module.exports = {
  siteMetadata: {
    siteUrl: `https://gallery.selfboot.cn/`,
    title: "AI Site Gallery",
    description: "",
    feedUrl: "/rss.xml",
    language: "en",
  },
  
  plugins: [
    {
      resolve: `gatsby-plugin-postcss`,
      options: {
        postCssPlugins: [require(`tailwindcss`), require(`autoprefixer`)],
      },
    },
    {
      resolve: "gatsby-plugin-sitemap",
      options: {},
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: ["G-Y4WD2DT404"],

        gtagConfig: {
          anonymize_ip: true,
          cookie_expires: 0,
        },

        pluginConfig: {
          respectDNT: true, // 是否在开发模式下启用跟踪
          head: false, // 跟踪脚本的延迟加载
          exclude: [],
        },
      },
    },
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        query: `
          {
            site {
              siteMetadata {
                title
                description
                siteUrl
                site_url: siteUrl
              }
            }
          }
        `,
        feeds: [
          {
            serialize: ({ query: { site } }) => {
              return pageMetadata.map((page) => ({
                title: page.title,
                description: page.description,
                url: page.url,
                guid: page.url,
                custom_elements: [
                  { "content:encoded": `<p>${page.description}</p>` },
                  ...(page.publishedDate ? [{ "pubDate": page.publishedDate }] : []), 
                ]
              }));
            },
            query: `
              {
                site {
                  siteMetadata {
                    siteUrl
                  }
                }
              }
            `,
            output: "/rss.xml",
            title: "Selfboot AI Gallery",
            site_url: "https://gallery.selfboot.cn",
            feed_url: "https://gallery.selfboot.cn/rss.xml",
          },
        ],
      },
    },
  ],
};
