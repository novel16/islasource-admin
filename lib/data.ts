export type Product = {
  id: string;
  name: string;
  category: string;
  image: string;
  unit: string;
  status: string;
  description: string;
  specs: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  og_image: string;
  indexable: boolean;
};
export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  location: string;
  specialty: string;
  status: string;
};
export type RFQ = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  location: string;
  deliveryDate: string;
  date: string;
  status: string;
  productId: string;
  quantity: number;
  note: string;
  offers: { supplierId: string; unitCost: number; availability: string }[];
  selectedSupplier: string;
  notes: string[];
};
export type Quote = {
  id: string;
  rfqId: string;
  quantity: number;
  unitCost: number;
  handling: number;
  markup: number;
  delivery: number;
  deposit: number;
  status: string;
  terms: string;
  validityDays?: number;
};
export type Order = {
  id: string;
  quoteId: string;
  customer: string;
  product: string;
  quantity: number;
  total: number;
  paid: number;
  status: string;
  deliveryDate: string;
  location: string;
  timeline: string[];
};
export type DemoData = {
  products: Product[];
  suppliers: Supplier[];
  rfqs: RFQ[];
  quotes: Quote[];
  orders: Order[];
  settings: {
    business: string;
    email: string;
    phone: string;
    address: string;
    validity: number;
    deposit: number;
  };
};

const product = (
  id: string,
  name: string,
  category: string,
  image: string,
  description: string,
): Product => ({
  id,
  name,
  category,
  image,
  description,
  unit: "kg",
  status: "Published",
  specs:
    "Sourced on request from Bantayan Island, Cebu. Grade, packing and availability confirmed in your quotation.",
  slug: name.toLowerCase().replaceAll(" ", "-"),
  meta_title: `${name} | Bantayan Seafoods`,
  meta_description: description,
  og_title: name,
  og_description: description,
  og_image: image,
  indexable: true,
});

export const initialData: DemoData = {
  products: [
    product(
      "dried-squid",
      "Premium dried squid",
      "Dried seafood",
      "/images/squid.jpg",
      "Naturally sun-dried squid from Bantayan Island. Rich, savory flavor and the perfect island pasalubong.",
    ),
    product(
      "blue-crab",
      "Fresh blue swimming crab",
      "Fresh seafood",
      "/images/crab.jpg",
      "Sweet, delicate blue swimming crab, carefully selected from our trusted local fishers.",
    ),
    product(
      "scallops",
      "Bantayan scallops",
      "Frozen seafood",
      "/images/scallops.jpg",
      "Tender island scallops, cleaned and frozen to preserve their natural sweetness.",
    ),
    product(
      "dried-fish",
      "Island dried danggit",
      "Dried seafood",
      "/images/dried-fish.jpg",
      "Lightly salted, sun-dried danggit. A crisp and delicious taste of home.",
    ),
  ],
  suppliers: [
    {
      id: "sup-1",
      name: "Isla North Seafoods",
      contact: "Ramon dela Cruz",
      phone: "+63 917 555 0101",
      location: "Bantayan, Cebu",
      specialty: "Dried squid, danggit",
      status: "Active",
    },
    {
      id: "sup-2",
      name: "Santa Fe Fishers Co-op",
      contact: "Lina Santos",
      phone: "+63 918 555 0202",
      location: "Santa Fe, Cebu",
      specialty: "Fresh crab, scallops",
      status: "Active",
    },
    {
      id: "sup-3",
      name: "Madridejos Island Catch",
      contact: "Jose Garcia",
      phone: "+63 919 555 0303",
      location: "Madridejos, Cebu",
      specialty: "Dried seafood",
      status: "Active",
    },
  ],
  rfqs: [
    {
      id: "RFQ-2026-001",
      customer: "Maia Reyes",
      email: "maia.reyes@example.com",
      phone: "+63 917 555 0148",
      location: "Lahug, Cebu City",
      deliveryDate: "2026-11-18",
      date: "Nov 13, 2026",
      status: "New",
      productId: "dried-squid",
      quantity: 5,
      note: "Medium size, please. For a family gathering. Delivery before lunch if possible.",
      offers: [
        {
          supplierId: "sup-1",
          unitCost: 50000,
          availability: "5 kg available · ready tomorrow",
        },
        {
          supplierId: "sup-3",
          unitCost: 52500,
          availability: "10 kg available · 2-day lead time",
        },
      ],
      selectedSupplier: "sup-1",
      notes: [],
    },
    {
      id: "RFQ-2026-002",
      customer: "The Seaside Kitchen",
      email: "hello@seaside.example.com",
      phone: "+63 918 555 0162",
      location: "Mandaue City, Cebu",
      deliveryDate: "2026-11-19",
      date: "Nov 13, 2026",
      status: "Sourcing",
      productId: "blue-crab",
      quantity: 12,
      note: "Live or very fresh crabs, restaurant grade. Weekly order possible.",
      offers: [
        {
          supplierId: "sup-2",
          unitCost: 38000,
          availability: "15 kg available · morning catch",
        },
      ],
      selectedSupplier: "sup-2",
      notes: ["Checking larger crab sizes with the co-op."],
    },
    {
      id: "RFQ-2026-003",
      customer: "Anton Villanueva",
      email: "anton@example.com",
      phone: "+63 915 555 0122",
      location: "Bacolod City",
      deliveryDate: "2026-11-20",
      date: "Nov 12, 2026",
      status: "Quoted",
      productId: "scallops",
      quantity: 8,
      note: "Cleaned scallops for a weekend event.",
      offers: [
        {
          supplierId: "sup-2",
          unitCost: 28000,
          availability: "20 kg available · frozen",
        },
      ],
      selectedSupplier: "sup-2",
      notes: [],
    },
    {
      id: "RFQ-2026-004",
      customer: "Luna Café",
      email: "orders@luna.example.com",
      phone: "+63 920 555 0119",
      location: "Iloilo City",
      deliveryDate: "2026-11-22",
      date: "Nov 12, 2026",
      status: "Ready",
      productId: "dried-fish",
      quantity: 10,
      note: "Small, boneless danggit for our breakfast menu.",
      offers: [
        {
          supplierId: "sup-1",
          unitCost: 42000,
          availability: "10 kg available",
        },
      ],
      selectedSupplier: "sup-1",
      notes: [],
    },
    {
      id: "RFQ-2026-005",
      customer: "Sofia Mendoza",
      email: "sofia@example.com",
      phone: "+63 916 555 0189",
      location: "Cebu City",
      deliveryDate: "2026-11-17",
      date: "Nov 11, 2026",
      status: "Quoted",
      productId: "dried-squid",
      quantity: 3,
      note: "Please vacuum pack in 500g portions.",
      offers: [
        { supplierId: "sup-1", unitCost: 50000, availability: "Available" },
      ],
      selectedSupplier: "sup-1",
      notes: [],
    },
  ],
  quotes: [
    {
      id: "QT-2026-001",
      rfqId: "RFQ-2026-001",
      quantity: 5,
      unitCost: 50000,
      handling: 20000,
      markup: 20,
      delivery: 35000,
      deposit: 50,
      status: "Draft",
      validityDays: 2,
      terms:
        "50% deposit confirms your order. Balance is due before dispatch. Availability is confirmed upon deposit.",
    },
    {
      id: "QT-2026-002",
      rfqId: "RFQ-2026-003",
      quantity: 8,
      unitCost: 28000,
      handling: 20000,
      markup: 20,
      delivery: 50000,
      deposit: 50,
      status: "Sent",
      validityDays: 2,
      terms: "50% deposit confirms your order. Balance is due before dispatch.",
    },
    {
      id: "QT-2026-003",
      rfqId: "RFQ-2026-005",
      quantity: 3,
      unitCost: 50000,
      handling: 15000,
      markup: 20,
      delivery: 25000,
      deposit: 50,
      status: "Accepted",
      validityDays: 2,
      terms: "50% deposit confirms your order. Balance is due before dispatch.",
    },
  ],
  orders: [
    {
      id: "ORD-2026-001",
      quoteId: "QT-2026-003",
      customer: "Sofia Mendoza",
      product: "Premium dried squid",
      quantity: 3,
      total: 223000,
      paid: 111500,
      status: "Processing",
      deliveryDate: "2026-11-17",
      location: "Cebu City",
      timeline: [
        "Quote accepted · Nov 11, 9:30 AM",
        "Demo deposit recorded · Nov 11, 10:15 AM",
        "Order confirmed · Nov 11, 10:16 AM",
      ],
    },
    {
      id: "ORD-2026-002",
      quoteId: "QT-2026-000",
      customer: "Coast & Co. Restaurant",
      product: "Fresh blue swimming crab",
      quantity: 15,
      total: 764000,
      paid: 764000,
      status: "Dispatched",
      deliveryDate: "2026-11-14",
      location: "Mandaue City, Cebu",
      timeline: [
        "Order confirmed · Nov 10",
        "Packed with care · Nov 12",
        "Dispatched · Nov 13",
      ],
    },
    {
      id: "ORD-2026-003",
      quoteId: "QT-2026-000",
      customer: "Gabriel Tan",
      product: "Bantayan scallops",
      quantity: 5,
      total: 218000,
      paid: 218000,
      status: "Completed",
      deliveryDate: "2026-11-12",
      location: "Cebu City",
      timeline: [
        "Order confirmed · Nov 8",
        "Packed with care · Nov 10",
        "Dispatched · Nov 11",
        "Delivered · Nov 12",
      ],
    },
  ],
  settings: {
    business: "Bantayan Seafoods",
    email: "hello@bantayanseafoods.com",
    phone: "+63 917 555 0100",
    address: "Bantayan Island, Cebu, Philippines",
    validity: 2,
    deposit: 50,
  },
};

export function calculateQuote(
  q: Pick<
    Quote,
    "quantity" | "unitCost" | "handling" | "markup" | "delivery" | "deposit"
  >,
) {
  if (!Number.isFinite(q.quantity) || q.quantity <= 0 || q.quantity > 100000)
    throw new RangeError(
      "Quantity must be greater than zero and at most 100,000 kg.",
    );
  for (const key of ["unitCost", "handling", "delivery"] as const)
    if (!Number.isSafeInteger(q[key]) || q[key] < 0)
      throw new RangeError("Costs must be nonnegative integer centavos.");
  if (!Number.isFinite(q.markup) || q.markup < 0 || q.markup > 1000)
    throw new RangeError("Markup must be between 0 and 1,000 percent.");
  if (!Number.isFinite(q.deposit) || q.deposit < 0 || q.deposit > 100)
    throw new RangeError("Deposit must be between 0 and 100 percent.");
  const cost = Math.round(q.quantity * q.unitCost);
  const markup = Math.round(((cost + q.handling) * q.markup) / 100);
  const subtotal = cost + q.handling + markup;
  const total = subtotal + q.delivery;
  if (!Number.isSafeInteger(total))
    throw new RangeError("The quotation total exceeds the supported range.");
  const deposit = Math.round((total * q.deposit) / 100);
  return { cost, markup, subtotal, total, deposit, balance: total - deposit };
}
export const money = (centavos: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(centavos / 100);
export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
