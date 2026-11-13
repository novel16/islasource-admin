"use client";
import { useState } from "react";
import { useDemo } from "./demo-provider";
import { Badge, Button, Dialog, EmptyState, Field, PageHeader } from "./ui";
import { Icon } from "./ui/icon";
import { type Supplier } from "@/lib/data";
const blank: Supplier = {
  id: "new",
  name: "",
  contact: "",
  phone: "",
  location: "",
  specialty: "",
  status: "Active",
};
export function Suppliers() {
  const { data, update, notify } = useDemo();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const rows = data.suppliers.filter((s) =>
    `${s.name} ${s.location} ${s.specialty} ${s.contact}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="GOOD PEOPLE, GOOD CATCH"
        title="Suppliers"
        description="Your private network of trusted island sources."
        actions={
          <Button onClick={() => setEditing({ ...blank })}>
            <Icon name="plus" size={17} />
            Add supplier
          </Button>
        }
      />
      <div className="suppliers-toolbar">
        <div className="search-input">
          <Icon name="search" size={17} />
          <input
            aria-label="Search suppliers"
            placeholder="Search name, location, or specialty…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span>
          <Icon
            name="eye"
            size={13}
            style={{ verticalAlign: "middle", marginRight: 6 }}
          />
          Private directory · never shared with customers
        </span>
      </div>
      {rows.length ? (
        <div className="suppliers-grid">
          {rows.map((s) => (
            <article className="supplier-card" key={s.id}>
              <div className="supplier-card-heading">
                <span className="supplier-avatar">
                  <Icon name="people" size={22} />
                </span>
                <Badge>{s.status}</Badge>
              </div>
              <h2>{s.name}</h2>
              <p>
                <Icon name="location" size={13} />
                {s.location}
              </p>
              <dl>
                <div>
                  <dt>YOUR CONTACT</dt>
                  <dd>{s.contact}</dd>
                </div>
                <div>
                  <dt>PHONE</dt>
                  <dd>{s.phone}</dd>
                </div>
                <div>
                  <dt>SPECIALTY</dt>
                  <dd>{s.specialty}</dd>
                </div>
              </dl>
              <div className="supplier-card-footer">
                <span className="muted small-text">Local demo record</span>
                <button
                  className="text-link"
                  onClick={() => setEditing({ ...s })}
                >
                  <Icon name="edit" size={14} />
                  Edit details
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      <div className="inline-tip">
        <Icon name="leaf" size={19} />
        Strong relationships are the freshest ingredient.
      </div>
      {editing && (
        <SupplierDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(supplier) => {
            const isNew = supplier.id === "new";
            const saved = {
              ...supplier,
              id: isNew ? `sup-${Date.now()}` : supplier.id,
            };
            update((d) => ({
              ...d,
              suppliers: isNew
                ? [...d.suppliers, saved]
                : d.suppliers.map((s) => (s.id === saved.id ? saved : s)),
            }));
            setEditing(null);
            notify(
              isNew
                ? "Supplier added to your local demo directory."
                : "Supplier details saved in this browser.",
            );
          }}
        />
      )}
    </>
  );
}
function SupplierDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: Supplier;
  onClose: () => void;
  onSave: (s: Supplier) => void;
}) {
  const [s, setS] = useState(initial);
  return (
    <Dialog
      title={
        initial.id === "new" ? "Add an island source" : "Edit supplier details"
      }
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !s.name.trim() ||
            !s.contact.trim() ||
            !s.phone.trim() ||
            !s.location.trim() ||
            !s.specialty.trim()
          )
            return;
          onSave({
            ...s,
            name: s.name.trim(),
            contact: s.contact.trim(),
            phone: s.phone.trim(),
            location: s.location.trim(),
            specialty: s.specialty.trim(),
          });
        }}
      >
        <div className="dialog-body">
          <div className="form-grid">
            {(
              [
                { key: "name", label: "Business name", full: true },
                { key: "contact", label: "Contact person" },
                { key: "phone", label: "Phone number" },
                { key: "location", label: "Location", full: true },
                { key: "specialty", label: "Seafood specialties", full: true },
              ] as const
            ).map((f) => (
              <Field
                key={f.key}
                label={f.label}
                className={"full" in f ? "full" : ""}
              >
                <input
                  aria-label={f.label}
                  type={f.key === "phone" ? "tel" : "text"}
                  value={s[f.key]}
                  onChange={(e) => setS({ ...s, [f.key]: e.target.value })}
                  required
                  maxLength={150}
                />
              </Field>
            ))}
            <Field label="Supplier status">
              <select
                aria-label="Supplier status"
                value={s.status}
                onChange={(e) => setS({ ...s, status: e.target.value })}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
          </div>
          <div className="soft-note">
            This is a private demo directory. Adding a supplier does not create
            an account or send an invitation.
          </div>
        </div>
        <div className="dialog-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Icon name="check" size={16} />
            Save supplier
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
