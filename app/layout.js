import "./globals.css";

export const metadata = {
  title: "Abdullah's Home Server",
  description: "A self-hosted Linux server that runs Abdullah Azmi's project backends, with live system metrics and architecture.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
