"use client";
import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon } from "./icon";
import { handleDialogCancel } from "@/lib/dialog";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`button ${variant} ${className}`}>
      {children}
    </Link>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  const key = String(children).toLowerCase().replaceAll(" ", "-");
  return (
    <span className={`badge status-${key}`}>
      <span />
      {children}
    </span>
  );
}
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const control = isValidElement<{ id?: string; "aria-describedby"?: string }>(
    children,
  )
    ? cloneElement(children, {
        id: children.props.id || id,
        "aria-describedby": hint ? `${id}-hint` : undefined,
      })
    : children;
  return (
    <div className={`field ${className}`}>
      <label
        htmlFor={
          isValidElement<{ id?: string }>(children)
            ? children.props.id || id
            : id
        }
      >
        {label}
      </label>
      {control}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}
export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function EmptyState({
  title = "No matching results",
  description = "Try a different search or filter.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <Icon name="search" size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={id}
      onCancel={(event) => handleDialogCancel(event, onClose)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id={id}>{title}</h2>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function SearchFilter({
  query,
  setQuery,
  status,
  setStatus,
  statuses,
  placeholder = "Search...",
}: {
  query: string;
  setQuery: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  statuses: string[];
  placeholder?: string;
}) {
  return (
    <div className="list-toolbar">
      <div className="search-input">
        <Icon name="search" size={18} />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button aria-label="Clear search" onClick={() => setQuery("")}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      <select
        aria-label="Filter by status or category"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="All">
          All {statuses.includes("Published") ? "statuses" : "records"}
        </option>
        {statuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="back-link" href={href}>
      <Icon name="arrow" size={15} style={{ transform: "rotate(180deg)" }} />
      {children}
    </Link>
  );
}
