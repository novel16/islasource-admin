import type { Metadata } from "next";
import { DemoProvider } from "@/components/demo-provider";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Overview · IslaSource Seafoods",
    template: "%s · IslaSource Seafoods",
  },
  description:
    "IslaSource Seafoods admin prototype. Sample data, local demo actions only.",
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
