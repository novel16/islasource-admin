"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "./demo-provider";
import { useAuth } from "./auth-provider";
import { AuthStatus } from "./auth-status";
import { Brand } from "./brand";
import { Icon } from "./ui/icon";
import {
  productListPath,
  workspaceSearchResults,
  type ProductPage,
} from "@/lib/products";
import { rfqListPath, type ApiRfqPage } from "@/lib/rfqs";
import { useApiResource } from "./use-api-resource";

const navigation = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/rfqs", label: "Quote requests", icon: "inbox" },
  { href: "/quotations", label: "Quotations", icon: "file" },
  { href: "/orders", label: "Orders", icon: "bag" },
  { href: "/products", label: "Products", icon: "box" },
  { href: "/suppliers", label: "Suppliers", icon: "people" },
  { href: "/settings", label: "Settings", icon: "settings" },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, data } = useDemo();
  const { status, user, logout } = useAuth();
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setCatalogQuery(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const catalogSearch = useApiResource<ProductPage>(
    status === "authenticated" && catalogQuery.trim().length >= 2
      ? productListPath({ search: catalogQuery, per_page: 5 })
      : null,
  );
  const rfqSearch = useApiResource<ApiRfqPage>(
    status === "authenticated" && catalogQuery.trim().length >= 2
      ? rfqListPath({ search: catalogQuery, per_page: 5 })
      : null,
  );
  const rfqCount = useApiResource<ApiRfqPage>(
    status === "authenticated" ? rfqListPath({ per_page: 1 }) : null,
  );
  useEffect(() => {
    if (status === "anonymous" && pathname !== "/login")
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      const editing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !editing && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearch("");
        setNotifications(false);
        setMobile(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);
  if (pathname === "/login") return children;
  if (!ready || status !== "authenticated") return <AuthStatus />;
  const initials =
    user?.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join("")
      .toUpperCase() || "A";
  const active =
    navigation.find((n) =>
      n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
    ) || navigation[0];
  const results = workspaceSearchResults(
    [
      ...data.rfqs.map((r) => ({
        label: `${r.id} · ${r.customer}`,
        href: `/rfqs/${r.id}`,
      })),
      ...(catalogQuery.trim() === search.trim()
        ? (rfqSearch.data?.data ?? []).map((rfq) => ({
            label: `${rfq.reference} · ${rfq.customer_name} · ${rfq.email} · ${rfq.items.map((item) => item.name).join(", ")}`,
            href: `/rfqs/${rfq.id}`,
          }))
        : []),
      ...data.quotes.map((q) => ({
        label: `${q.id} · ${data.rfqs.find((r) => r.id === q.rfqId)?.customer ?? "Quotation"}`,
        href: `/quotations/${q.id}`,
      })),
      ...data.orders.map((o) => ({
        label: `${o.id} · ${o.customer}`,
        href: `/orders/${o.id}`,
      })),
      ...navigation.map((n) => ({ label: n.label, href: n.href })),
    ],
    catalogQuery.trim() === search.trim() ? catalogSearch.data?.data ?? [] : [],
    search,
  );
  function closeNav() {
    setMobile(false);
    setSearch("");
    setNotifications(false);
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="workspace-sidebar"
        className={`sidebar ${mobile ? "is-open" : ""}`}
      >
        <Link
          href="/"
          aria-label="IslaSource Seafoods overview"
          onClick={closeNav}
        >
          <Brand />
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={closeNav}
              aria-current={active.href === n.href ? "page" : undefined}
              className={`nav-link ${active.href === n.href ? "active" : ""}`}
            >
              <Icon name={n.icon} size={20} />
              {n.label}
              {n.href === "/rfqs" && Boolean(rfqCount.data?.meta.total) && (
                <span className="nav-count">
                  {rfqCount.data?.meta.total}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="prototype-note">
            <span className="tiny-dot" />
            {pathname.startsWith("/products")
              ? "PRODUCT CATALOG"
              : "SAMPLE BUSINESS DATA"}
            <p>Good things start at the source.</p>
          </div>
          <div className="admin-identity">
            <div className="avatar">{initials}</div>
            <div>
              <strong>{user?.name}</strong>
              <span>Administrator</span>
            </div>
            <button
              title="Log out"
              aria-label="Log out"
              onClick={() => void logout()}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="workspace-sidebar"
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <Icon name="chevron" size={13} />
            <strong>{active.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Icon name="search" size={17} />
              <input
                ref={searchRef}
                aria-label="Search workspace"
                placeholder="Search workspace…"
                value={search}
                maxLength={100}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>/</kbd>
              {search && (
                <div className="search-results">
                  {results.length ? (
                    results.map((r) => (
                      <Link
                        key={r.href + r.label}
                        href={r.href}
                        onClick={() => setSearch("")}
                      >
                        <Icon name="search" size={15} />
                        {r.label}
                        <Icon name="arrow" size={14} />
                      </Link>
                    ))
                  ) : (
                    <p>No matches found.</p>
                  )}
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <div className="notification-wrap">
              <button
                className="notification-button"
                aria-expanded={notifications}
                aria-label="View notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <Icon name="bell" size={21} />
                <span />
              </button>
              {notifications && (
                <div className="notification-popover">
                  <div>
                    <strong>Your updates</strong>
                    <span>Demo activity</span>
                  </div>
                  <Link
                    href="/rfqs/RFQ-2026-001"
                    onClick={() => setNotifications(false)}
                  >
                    <span className="notification-symbol">
                      <Icon name="inbox" size={18} />
                    </span>
                    <span>
                      <strong>A fresh request is here</strong>
                      <small>Maia Reyes requested 5 kg dried squid.</small>
                      <em>Today · Sample notification</em>
                    </span>
                  </Link>
                  <Link
                    href="/orders/ORD-2026-001"
                    onClick={() => setNotifications(false)}
                  >
                    <span className="notification-symbol coral">
                      <Icon name="bag" size={18} />
                    </span>
                    <span>
                      <strong>An order needs packing</strong>
                      <small>Sofia’s order is scheduled for Nov 17.</small>
                      <em>Demo reminder</em>
                    </span>
                  </Link>
                </div>
              )}
            </div>
            <div className="top-avatar" title={user?.name}>
              {initials}
            </div>
          </div>
        </header>
        <main className="main-content">{children}</main>
        <footer className="workspace-footer">
          <span>Fresh from the island. Managed with care.</span>
          <span>
            <span className="tiny-dot" />{" "}
            {pathname.startsWith("/products")
              ? "Catalog · Saved product records"
              : "Prototype · Sample business records"}
          </span>
        </footer>
      </div>
    </div>
  );
}
