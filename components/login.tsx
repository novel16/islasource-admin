"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDemo } from "./demo-provider";
import { Brand } from "./app-shell";
import { Button } from "./ui";
import { Icon } from "./ui/icon";
export function Login() {
  const { login } = useDemo();
  const router = useRouter();
  return (
    <main className="login-page">
      <section className="login-form">
        <Brand />
        <div>
          <span className="eyebrow">THE ISLAND, AT YOUR FINGERTIPS</span>
          <h1>
            A little closer
            <br />
            to the source.
          </h1>
          <p>
            Welcome to your Bantayan Seafoods workspace.
            <br />
            Good catch. Clear quotes. Happy customers.
          </p>
          <div className="demo-disclosure">
            <Icon name="leaf" size={21} />
            <div>
              <strong>Take a look around</strong>
              <p>
                This is an interactive demo with sample data. No credentials are
                collected, and no real messages or payments are sent. The demo
                gate is not secure authentication.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              login();
              router.replace("/");
            }}
          >
            Enter demo workspace
            <Icon name="arrow" size={18} />
          </Button>
          <small>Your changes are saved in this browser.</small>
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
