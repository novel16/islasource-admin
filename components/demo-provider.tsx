"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initialData, migrateDemoBrand, type DemoData } from "@/lib/data";
import { Icon } from "./ui/icon";

type DemoContext = {
  data: DemoData;
  update: (change: (data: DemoData) => DemoData) => void;
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  notify: (message: string) => void;
};
const Context = createContext<DemoContext | null>(null);
const STORAGE_KEY = "bantayan-admin-demo-v1";
export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initialData);
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            Array.isArray(parsed.products) &&
            Array.isArray(parsed.rfqs) &&
            parsed.settings
          )
            setData(migrateDemoBrand(parsed));
        }
        setAuthenticated(
          sessionStorage.getItem("bantayan-demo-entered") === "true",
        );
      } catch {
        setToast(
          "Browser storage is unavailable. Changes will last for this visit.",
        );
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function update(change: (data: DemoData) => DemoData) {
    setData((current) => {
      const next = change(current);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        setToast("Saved for this visit. Browser storage is unavailable.");
      }
      return next;
    });
  }
  function login() {
    try {
      sessionStorage.setItem("bantayan-demo-entered", "true");
    } catch {}
    setAuthenticated(true);
  }
  function logout() {
    try {
      sessionStorage.removeItem("bantayan-demo-entered");
    } catch {}
    setAuthenticated(false);
  }
  return (
    <Context.Provider
      value={{
        data,
        update,
        ready,
        authenticated,
        login,
        logout,
        notify: setToast,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Icon name="check" size={18} />
          </span>
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("DemoProvider is required");
  return context;
}
