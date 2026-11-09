/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deployments dedicated to one app (e.g. the Playdates service on Render)
  // set ROOT_REDIRECT=/playdates so the bare domain opens that app.
  async redirects() {
    const to = process.env.ROOT_REDIRECT;
    return to ? [{ source: "/", destination: to, permanent: false }] : [];
  },
};
module.exports = nextConfig;
