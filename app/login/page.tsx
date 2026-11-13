import { Login } from "@/components/login";
import { Suspense } from "react";
import { AuthStatus } from "@/components/auth-status";
export const metadata = { title: "Sign in" };
export default function Page() {
  return (
    <Suspense fallback={<AuthStatus />}>
      <Login />
    </Suspense>
  );
}
