import type { Metadata } from "next";
import { DemoProvider } from "@/components/demo-provider";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Overview · IslaSource Seafoods",
    template: "%s · IslaSource Seafoods",
  },
  description:
    "IslaSource Seafoods admin workspace. Authorized team access with sample business records.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <DemoProvider>
            <AppShell>{children}</AppShell>
          </DemoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
