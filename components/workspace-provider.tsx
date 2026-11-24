"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { defaultWorkspaceSettings, type WorkspaceSettings } from "@/lib/data";
import { Icon } from "./ui/icon";

type WorkspaceContextValue = {
  settings: WorkspaceSettings;
  updateSettings: (next: WorkspaceSettings) => void;
  resetSettings: () => void;
  notify: (message: string) => void;
};

const Context = createContext<WorkspaceContextValue | null>(null);
const STORAGE_KEY = "islasource-admin-settings-v1";
const CHANGE_EVENT = "islasource-admin-settings-change";

let storageAvailable = true;
let memoryRaw = "";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function readSnapshot(): string {
  if (!storageAvailable) return memoryRaw;
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    storageAvailable = false;
    return memoryRaw;
  }
}

function parseSettings(raw: string): WorkspaceSettings {
  if (!raw) return defaultWorkspaceSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSettings>;
    return {
      business:
        typeof parsed.business === "string" && parsed.business.trim()
          ? parsed.business
          : defaultWorkspaceSettings.business,
      email:
        typeof parsed.email === "string" && parsed.email.trim()
          ? parsed.email
          : defaultWorkspaceSettings.email,
      phone:
        typeof parsed.phone === "string"
          ? parsed.phone
          : defaultWorkspaceSettings.phone,
      address:
        typeof parsed.address === "string" && parsed.address.trim()
          ? parsed.address
          : defaultWorkspaceSettings.address,
      validity:
        typeof parsed.validity === "number" &&
        Number.isInteger(parsed.validity) &&
        parsed.validity >= 1 &&
        parsed.validity <= 30
          ? parsed.validity
          : defaultWorkspaceSettings.validity,
    };
  } catch {
    return defaultWorkspaceSettings;
  }
}

function persistSettings(next: WorkspaceSettings): boolean {
  memoryRaw = JSON.stringify(next);
  let persisted = true;
  try {
    localStorage.setItem(STORAGE_KEY, memoryRaw);
  } catch {
    storageAvailable = false;
    persisted = false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return persisted;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readSnapshot, () => "");
  const settings = useMemo(() => parseSettings(raw), [raw]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  function updateSettings(next: WorkspaceSettings) {
    if (!persistSettings(next)) {
      setToast("Saved for this visit. Browser storage is unavailable.");
    }
  }

  function resetSettings() {
    persistSettings(defaultWorkspaceSettings);
  }

  return (
    <Context.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
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

export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("WorkspaceProvider is required");
  return context;
}
