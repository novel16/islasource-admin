export type WorkspaceSettings = {
  business: string;
  email: string;
  phone: string;
  address: string;
  validity: number;
  deposit: number;
};

export const defaultWorkspaceSettings: WorkspaceSettings = {
  business: "IslaSource Seafoods",
  email: "hello@islasource.ph",
  phone: "",
  address: "Bantayan Island, Cebu, Philippines",
  validity: 2,
  deposit: 50,
};

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
