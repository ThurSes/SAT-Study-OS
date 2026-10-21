"use client";

import { useEffect, useRef, useState } from "react";
import type { ExamSnapshot } from "@/types/domain";
import styles from "./exam.module.css";

type Calculator = { getState(): unknown; setState(state: unknown): void; observeEvent(event: "change", callback: () => void): void; unobserveEvent(event: "change"): void; destroy(): void };
type DesmosApi = { GraphingCalculator(element: HTMLElement, options: Record<string, unknown>): Calculator; ScientificCalculator(element: HTMLElement, options: Record<string, unknown>): Calculator; enabledFeatures?: Record<string, boolean> };
declare global { interface Window { Desmos?: DesmosApi } }
let loading: Promise<DesmosApi> | undefined;
function loadDesmos(key: string): Promise<DesmosApi> {
  if (window.Desmos) return Promise.resolve(window.Desmos);
  if (!loading) loading = new Promise<DesmosApi>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error("The calculator did not respond.")); }, 15000);
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${encodeURIComponent(key)}`;
    script.async = true;
    script.onload = () => { window.clearTimeout(timeout); if (window.Desmos) resolve(window.Desmos); else reject(new Error("Calculator unavailable.")); };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); reject(new Error("Calculator unavailable.")); };
    document.head.appendChild(script);
  }).catch((error: unknown) => { loading = undefined; throw error; });
  return loading;
}

export function ExamCalculator({ state, onChange, disabled = false, apiKey }: { state: ExamSnapshot["calculator"]; onChange: (state: ExamSnapshot["calculator"]) => void; disabled?: boolean; apiKey?: string }) {
  const [mode, setMode] = useState<"graphing" | "scientific">("graphing");
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const host = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const changeRef = useRef(onChange);
  const instance = useRef<Calculator | undefined>(undefined);
  const restoring = useRef(false);
  const receivedState = useRef(JSON.stringify(state));
  useEffect(() => {
    changeRef.current = onChange;
    stateRef.current = state;
    const calculator = instance.current;
    const incoming = state[mode];
    const serialized = JSON.stringify(state);
    const changed = serialized !== receivedState.current;
    receivedState.current = serialized;
    // The server can replace state after explicit conflict recovery. Updating a ref
    // alone would leave the old, unconfirmed expressions visible in Desmos.
    if (changed && calculator && JSON.stringify(incoming ?? {}) !== JSON.stringify(calculator.getState())) {
      restoring.current = true;
      try { calculator.setState(incoming ?? {}); }
      finally { restoring.current = false; }
    }
  }, [onChange, state, mode]);
  const key = apiKey ?? process.env.NEXT_PUBLIC_DESMOS_API_KEY;
  useEffect(() => {
    if (!key || disabled) return;
    let disposed = false;
    let calculator: Calculator | undefined;
    void loadDesmos(key).then((api) => {
      if (disposed || !host.current) return;
      const factory = mode === "graphing" ? "GraphingCalculator" : "ScientificCalculator";
      if (api.enabledFeatures?.[factory] === false) throw new Error("Feature not enabled for this API key.");
      // Assessment-oriented controls. Official testing links remain available for the exact SAT preset.
      calculator = api[factory](host.current, { language: "en", fontSize: 16, capExpressionSize: true, allowComplex: false, images: false, folders: false, notes: false, links: false, distributions: false, restrictedFunctions: true, forceEnableGeometryFunctions: true, forceLogModeRegressions: true, customRegressions: false, regressionTemplates: true, pasteGraphLink: false, actions: false, tone: false });
      instance.current = calculator;
      if (stateRef.current[mode]) calculator.setState(stateRef.current[mode]);
      calculator.observeEvent("change", () => {
        if (!calculator || restoring.current) return;
        stateRef.current = { ...stateRef.current, [mode]: calculator.getState() };
        // Queue immediately: the workspace coalesces undispatched changes. A
        // navigation, answer save or server refresh must not erase a debounce.
        changeRef.current(stateRef.current);
      });
      setStatus("ready");
    }).catch(() => { if (!disposed) setStatus("unavailable"); });
    return () => {
      disposed = true;
      calculator?.unobserveEvent("change");
      calculator?.destroy();
      if (instance.current === calculator) instance.current = undefined;
    };
  }, [key, mode, disabled]);
  return <section className={styles.calculator} aria-label="Calculator">
    <div className={styles.toolbar} aria-label="Calculator type"><button type="button" aria-pressed={mode === "graphing"} onClick={() => { if (mode !== "graphing") { setMode("graphing"); setStatus("loading"); } }}>Graphing</button><button type="button" aria-pressed={mode === "scientific"} onClick={() => { if (mode !== "scientific") { setMode("scientific"); setStatus("loading"); } }}>Scientific</button></div>
    {!key || status === "unavailable" ? <p className={styles.notice}>The embedded calculator is unavailable. Use the official SAT calculator in a new tab. The test timer keeps running.</p> : disabled ? <p>The module has ended. Calculator input is closed.</p> : <><div role="status">{status === "loading" ? "Loading calculator…" : ""}</div><div className={styles.calculatorHost} ref={host} /></>}
    <div className={styles.calculatorLinks}><a href="https://www.desmos.com/testing/collegeboard/graphing?lang=eng" target="_blank" rel="noopener noreferrer">SAT graphing calculator ↗</a><a href="https://www.desmos.com/testing/collegeboard/scientific?lang=eng" target="_blank" rel="noopener noreferrer">SAT scientific calculator ↗</a></div><p className={styles.muted}>Graphing and scientific work are kept separately. External calculator work is not saved here.</p>
  </section>;
}
