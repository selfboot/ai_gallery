module.exports = {
  siteMetadata: {
    siteUrl: `https://gallery.selfboot.cn/`, // 替换成你的网站地址
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
  ],
};
