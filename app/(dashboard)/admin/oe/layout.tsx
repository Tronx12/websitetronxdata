import "../../oe.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open-End Team Portal",
  description: "OE submission and DQA review portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="oe-portal">{children}</div>
      </body>
    </html>
  );
}