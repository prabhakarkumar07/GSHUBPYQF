"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "./providers";
import { IconX } from "./icons";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Tiny shared store: the browser's install prompt + "already installed" state.
let deferred: BIPEvent | null = null;
let installed = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
const snap = () => `${!!deferred}|${installed}`;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios/i.test(navigator.userAgent);

function useInstall() {
  const state = useSyncExternalStore(subscribe, snap, () => "false|false");
  const [env, setEnv] = useState({ standalone: true, ios: false });
  useEffect(() => {
    setEnv({ standalone: isStandalone(), ios: isIOS() });
  }, []);
  const [canPrompt, done] = state.split("|").map((x) => x === "true");
  const available = !env.standalone && !done && (canPrompt || env.ios);
  return { available, ios: env.ios && !canPrompt };
}

/** Registers the service worker (production only). */
function useServiceWorker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    const reg = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") reg();
    else window.addEventListener("load", reg, { once: true });
  }, []);
}

function IosHelp({ onClose }: { onClose: () => void }) {
  const { lang } = useApp();
  const hi = lang === "hi";
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-maroon">
          {hi ? "iPhone पर ऐप ऐसे जोड़ें" : "Add the app on iPhone"}
        </h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] text-stone-700">
          <li>
            {hi
              ? "Safari में नीचे Share बटन (□↑) दबाएँ"
              : "Tap the Share button (□↑) at the bottom of Safari"}
          </li>
          <li>
            {hi ? "“Add to Home Screen” चुनें" : "Choose “Add to Home Screen”"}
          </li>
          <li>
            {hi ? "ऊपर “Add” दबाएँ" : "Tap “Add” at the top"}
          </li>
        </ol>
        <button className="btn-primary mt-4 w-full" onClick={onClose}>
          {hi ? "ठीक है" : "Got it"}
        </button>
      </div>
    </div>
  );
}

/** Small "Install app" button (footer, mobile menu). Hidden once installed. */
export function InstallButton({ className = "" }: { className?: string }) {
  const { lang } = useApp();
  const { available, ios } = useInstall();
  const [help, setHelp] = useState(false);
  if (!available) return null;
  const click = async () => {
    if (ios) {
      setHelp(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    if (r?.outcome === "accepted") {
      deferred = null;
      installed = true;
      emit();
    }
  };
  return (
    <>
      <button onClick={click} className={className}>
        {lang === "hi" ? "ऐप इंस्टॉल करें" : "Install app"}
      </button>
      {help && <IosHelp onClose={() => setHelp(false)} />}
    </>
  );
}

const DISMISS_KEY = "gshub_install_dismissed";

/** Bottom banner on phones inviting students to install the app (once a week at most). */
export function InstallBanner() {
  useServiceWorker();
  const { lang } = useApp();
  const path = usePathname();
  const { available, ios } = useInstall();
  const [show, setShow] = useState(false);
  const [help, setHelp] = useState(false);
  const hi = lang === "hi";

  useEffect(() => {
    if (!available) {
      setShow(false);
      return;
    }
    let last = 0;
    try {
      last = Number(localStorage.getItem(DISMISS_KEY) || 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - last < 7 * 864e5) return; // 1 week
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, [available]);

  if (!show || path.startsWith("/quiz/") || path.startsWith("/admin")) {
    return help ? <IosHelp onClose={() => setHelp(false)} /> : null;
  }
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };
  const install = async () => {
    if (ios) {
      setHelp(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    if (r?.outcome === "accepted") {
      deferred = null;
      installed = true;
      emit();
    }
    close();
  };

  return (
    <>
      <div
        className="fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex items-center gap-3 rounded-2xl bg-maroon p-3 text-white shadow-xl ring-1 ring-gold/50 lg:inset-x-auto lg:bottom-6 lg:left-6 lg:max-w-sm"
        role="dialog"
        aria-label="Install app"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">
            {hi ? "GS Hub ऐप इंस्टॉल करें" : "Install the GS Hub app"}
          </div>
          <div className="text-xs text-white/75">
            {hi ? "होम स्क्रीन से एक टैप में खोलें" : "Open from your home screen in one tap"}
          </div>
        </div>
        <button onClick={install} className="shrink-0 rounded-xl bg-gold px-3 py-2 text-sm font-bold text-maroon-900">
          {hi ? "इंस्टॉल" : "Install"}
        </button>
        <button
          onClick={close}
          aria-label={hi ? "बंद करें" : "Close"}
          className="shrink-0 rounded-lg p-1 text-white/70 hover:bg-white/10"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>
      {help && <IosHelp onClose={() => setHelp(false)} />}
    </>
  );
}