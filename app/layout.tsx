import type { Metadata } from "next";
import { DemoProvider } from "@/components/demo-provider";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Overview · Bantayan Seafoods",
    template: "%s · Bantayan Seafoods",
  },
  description:
    "Bantayan Seafoods admin prototype. Sample data, local demo actions only.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
