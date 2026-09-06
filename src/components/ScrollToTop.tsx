import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const KEY = "scroll-positions";

const readPositions = (): Record<string, number> => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

const writePosition = (key: string, value: number) => {
  try {
    const all = readPositions();
    all[key] = value;
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
};

/**
 * Nova navegação (PUSH) começa no topo.
 * Voltar/avançar (POP) restaura a posição onde o usuário parou.
 */
const ScrollToTop = () => {
  const { pathname, search, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const storageKey = key || `${pathname}${search}`;

  // Salva a posição continuamente para a entrada atual do histórico.
  useEffect(() => {
    const save = () => writePosition(storageKey, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      window.removeEventListener("scroll", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [storageKey]);

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    if (navigationType === "POP") {
      const saved = readPositions()[storageKey];
      if (typeof saved === "number") {
        // Aguarda o conteúdo renderizar antes de restaurar.
        let tries = 0;
        const restore = () => {
          window.scrollTo({ top: saved, left: 0, behavior: "auto" });
          if (Math.abs(window.scrollY - saved) > 4 && tries < 20) {
            tries += 1;
            requestAnimationFrame(restore);
          }
        };
        requestAnimationFrame(restore);
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search, hash, navigationType, storageKey]);

  return null;
};

export default ScrollToTop;
