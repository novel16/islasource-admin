"use client";

import { useAuth } from "./auth-provider";
import { Brand } from "./brand";
import { Button } from "./ui";

export function AuthStatus() {
  const { status, message, restore, logout } = useAuth();
  return (
    <div className="workspace-loading">
      <Brand />
      <p role="status">
        {status === "unavailable"
          ? message
          : status === "anonymous"
            ? "Opening sign-in…"
            : "Checking your sign-in…"}
      </p>
      {status === "unavailable" && (
        <div className="auth-retry-actions">
          <Button onClick={() => void restore()}>Try again</Button>
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out on this device
          </Button>
        </div>
      )}
    </div>
  );
}
