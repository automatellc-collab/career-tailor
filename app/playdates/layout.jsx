export const metadata = {
  title: "Playdates",
  description: "Invite another parent to a playdate. They accept, it lands on their calendar.",
  appleWebApp: { capable: true, title: "Playdates", statusBarStyle: "black-translucent" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function PlaydatesLayout({ children }) {
  return children;
}
