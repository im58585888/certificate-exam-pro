"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// "Install the app" card: uses the browser's install prompt where there is one (Chrome, Edge, Android) and shows
// Add to Home Screen steps on iPhone and iPad. Hidden once the site is running as an installed app.
export function InstallApp() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let dismissed = false;
    try { dismissed = localStorage.getItem("cep-install-dismissed") === "1"; } catch {}
    if (standalone || dismissed) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); setHidden(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    /* eslint-disable react-hooks/set-state-in-effect -- reads the device once on mount */
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { setIos(true); setHidden(false); }
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem("cep-install-dismissed", "1"); } catch {} };
  return (
    <aside className="card mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-extrabold">📱 Study on your phone</p>
        <p className="text-sm text-soft">
          {ios ? "Tap the Share button, then “Add to Home Screen”. It opens like an app, with the same account and pass." : "Install Certificate Exam Pro to open it like an app. Same account, same pass, no app store."}
        </p>
      </div>
      <div className="flex gap-2">
        {evt && <button type="button" className="btn-primary !py-2" onClick={async () => { await evt.prompt(); await evt.userChoice; setHidden(true); }}>Install app</button>}
        <button type="button" className="btn-ghost !py-2" onClick={dismiss}>Not now</button>
      </div>
    </aside>
  );
}
