import { SessionProvider } from "../lib/session";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata = {
  title: "DEPUKO | Find people who make it happen",
  description: "Find the right people to bring your ideas to life. Discover services on DEPUKO.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><ThemeProvider><SessionProvider>{children}</SessionProvider></ThemeProvider></body>
    </html>
  );
}
