import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const KEY = "scroll-positions";

type Pos = { w: number; c: number };

const getContainer = () => document.getElementById("scroll-container");

const readPositions = (): Record<string, Pos> => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

const writePosition = (key: string, value: Pos) => {
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
 * Voltar/avançar (POP) restaura a posição onde o usuário parou,
 * tanto na janela quanto no container rolável do painel admin.
 */
const ScrollToTop = () => {
  const { pathname, search, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const storageKey = key || `${pathname}${search}`;

  // Salva a posição continuamente para a entrada atual do histórico.
  useEffect(() => {
    const save = () =>
      writePosition(storageKey, {
        w: window.scrollY,
        c: getContainer()?.scrollTop ?? 0,
      });

    const container = getContainer();
    window.addEventListener("scroll", save, { passive: true });
    container?.addEventListener("scroll", save, { passive: true });
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      window.removeEventListener("scroll", save);
      container?.removeEventListener("scroll", save);
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
      if (saved) {
        let tries = 0;
        const restore = () => {
          window.scrollTo({ top: saved.w, left: 0, behavior: "auto" });
          const container = getContainer();
          if (container) container.scrollTop = saved.c;
          const offWindow = Math.abs(window.scrollY - saved.w) > 4;
          const offContainer = container ? Math.abs(container.scrollTop - saved.c) > 4 : false;
          if ((offWindow || offContainer) && tries < 25) {
            tries += 1;
            requestAnimationFrame(restore);
          }
        };
        requestAnimationFrame(restore);
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const container = getContainer();
    if (container) container.scrollTop = 0;
  }, [pathname, search, hash, navigationType, storageKey]);

  return null;
};

export default ScrollToTop;
