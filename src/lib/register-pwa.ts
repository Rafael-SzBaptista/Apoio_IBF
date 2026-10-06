let started = false;

export function registerServiceWorker() {
  if (started || typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  started = true;

  const register = () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* O site continua funcionando se o service worker não instalar. */
    });
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
