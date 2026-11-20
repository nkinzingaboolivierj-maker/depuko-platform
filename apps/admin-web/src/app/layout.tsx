import "./globals.css";
import "./navy-refresh.css";
import { AdminSessionProvider } from "../components/AdminSessionProvider";

export const metadata = {
  title: "DEPUKO Admin",
  description: "DEPUKO administrative workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AdminSessionProvider>{children}</AdminSessionProvider></body></html>;
}