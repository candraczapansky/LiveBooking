module.exports = {
  apps: [
    {
      name: "glo-app",
      script: "dist/server/index.js",
      node_args: "--experimental-specifier-resolution=node",
      env: {
        NODE_ENV: "production",
        CUSTOM_DOMAIN: "https://www.glofloapp.com",
        VITE_API_BASE_URL: "https://www.glofloapp.com"
      }
    }
  ]
};