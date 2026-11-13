"use client";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { safeReturnPath } from "@/lib/auth-session";
import { useAuth } from "./auth-provider";
import { AuthStatus } from "./auth-status";
import { Brand } from "./brand";
import { Button, Field } from "./ui";
import { Icon } from "./ui/icon";
export function Login() {
  const { login, status, busy, message } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") router.replace(returnTo);
  }, [status, returnTo, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setErrors({});
    setError("");
    try {
      if (await login({ email, password })) setPassword("");
    } catch (failure) {
      if (failure instanceof ApiError) {
        setErrors(failure.errors);
        setError(failure.message);
      } else {
        setError("We couldn’t sign you in. Please try again.");
      }
    }
  }

  if (status !== "anonymous") return <AuthStatus />;
  return (
    <main className="login-page">
      <section className="login-form">
        <Brand />
        <div>
          <span className="eyebrow">YOUR ISLASOURCE WORKSPACE</span>
          <h1>Welcome back.</h1>
          <p>
            Sign in to manage your island connections,
            <br />
            quote requests, and seafood orders.
          </p>
          {message && (
            <div className="auth-notice" role="status">
              {message}
            </div>
          )}
          <form className="auth-form" onSubmit={submit} aria-busy={busy}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            <Field
              label="Email address"
              hint={errors.email?.[0]}
              className={errors.email?.length ? "field-invalid" : ""}
            >
              <input
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
                value={email}
                disabled={busy}
                aria-invalid={Boolean(errors.email?.length)}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field
              label="Password"
              hint={errors.password?.[0]}
              className={errors.password?.length ? "field-invalid" : ""}
            >
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
                value={password}
                disabled={busy}
                aria-invalid={Boolean(errors.password?.length)}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? "Please wait…" : "Sign in"}
              <Icon name="arrow" size={18} />
            </Button>
          </form>
          <small>Access for authorized IslaSource team members.</small>
        </div>
        <span className="login-footnote">
          BANTAYAN ISLAND, CEBU · PHILIPPINES
        </span>
      </section>
      <section className="login-image">
        <Image
          src="/images/island.jpg"
          alt="Calm tropical shores of Bantayan Island"
          fill
          priority
          sizes="55vw"
        />
        <div>
          <span>FROM OUR SHORES TO YOURS</span>
          <h2>
            Rooted in the island.
            <br />
            Made for your table.
          </h2>
          <p>Seafood with a story. Sourced with care.</p>
        </div>
      </section>
    </main>
  );
}
