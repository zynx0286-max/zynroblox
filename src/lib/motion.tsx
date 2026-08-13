import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type MotionContextValue = {
  /** true when heavy scroll/3D effects should be disabled */
  reduced: boolean;
  /** user's explicit choice, null = follow the OS setting */
  preference: boolean | null;
  setReduced: (value: boolean) => void;
  toggle: () => void;
};

const STORAGE_KEY = "zyn:reduce-motion";

const MotionContext = createContext<MotionContextValue>({
  reduced: false,
  preference: null,
  setReduced: () => {},
  toggle: () => {},
});

export function MotionProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<boolean | null>(null);
  const [system, setSystem] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setPreference(true);
    else if (stored === "false") setPreference(false);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystem(mq.matches);
    const onChange = () => setSystem(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const reduced = preference ?? system;

  useEffect(() => {
    document.documentElement.dataset["reducedMotion"] = reduced ? "true" : "false";
  }, [reduced]);

  const setReduced = useCallback((value: boolean) => {
    setPreference(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* storage can be blocked — the choice just won't persist */
    }
  }, []);

  const toggle = useCallback(() => setReduced(!reduced), [reduced, setReduced]);

  return (
    <MotionContext.Provider value={{ reduced, preference, setReduced, toggle }}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotion() {
  return useContext(MotionContext);
}

/** true when animations should run */
export function useAnimationsEnabled() {
  return !useMotion().reduced;
}
