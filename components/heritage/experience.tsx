"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  LocaleProvider,
  useLocale,
  LanguageSelect,
} from "@/components/i18n/locale";
import type { Locale } from "@/lib/i18n/core";
import type { Appearance } from "@/lib/heritage/appearance";

const memory = new Map<string, string>();
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("hustlen:preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("hustlen:preferences", callback);
  };
}
function usePreference(key: string, fallback: string, allowed: string[]) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const saved = localStorage.getItem(key);
        if (saved && allowed.includes(saved)) return saved;
      } catch {}
      return memory.get(key) ?? fallback;
    },
    () => fallback,
  );
  function update(next: string) {
    if (!allowed.includes(next)) return;
    memory.set(key, next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Nonessential preferences remain usable in memory. */
    }
    window.dispatchEvent(new Event("hustlen:preferences"));
  }
  return [value, update] as const;
}
const subscribeReadiness = () => () => {};
const readyClient = () => true;
const readyServer = () => false;
const Experience = createContext({ effects: true, sound: false });
export function HeritageSurface({
  initialLocale = "en",
  ...props
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
  initialTheme: Appearance;
  chromeOnly?: boolean;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <HeritageSurfaceContents {...props} />
    </LocaleProvider>
  );
}
function HeritageSurfaceContents({
  children,
  initialTheme,
  chromeOnly = false,
}: {
  children: React.ReactNode;
  initialTheme: Appearance;
  chromeOnly?: boolean;
}) {
  const { locale, t } = useLocale();
  const preferencesReady = useSyncExternalStore(
    subscribeReadiness,
    readyClient,
    readyServer,
  );
  const [theme, setTheme] = usePreference(
    "hustlen:catalogue-theme",
    initialTheme,
    ["light", "dark", "system"],
  );
  const [effects, setEffects] = usePreference("hustlen:effects", "on", [
    "on",
    "off",
  ]);
  const [sound, setSound] = usePreference("hustlen:sound", "off", [
    "on",
    "off",
  ]);
  useEffect(() => {
    // Migrate the old local-only preference once; subsequent document responses know the theme.
    try {
      document.cookie = `hustlen_appearance=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      /* Optional preference persistence may be unavailable. */
    }
  }, [theme]);
  function appearance(value: string) {
    setTheme(value);
    try {
      document.cookie = `hustlen_appearance=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      /* Optional preference persistence may be unavailable. */
    }
  }
  return (
    <Experience.Provider
      value={{ effects: effects === "on", sound: sound === "on" }}
    >
      <div
        className={
          chromeOnly
            ? "catalogue heritage heritage-chrome"
            : "catalogue heritage"
        }
        lang={locale}
        data-locale={locale}
        data-theme={theme}
        data-effects={effects}
      >
        {children}
        {!chromeOnly && (
          <aside
            id="experience-preferences"
            className="heritage-preferences"
            aria-label={t("pref.region")}
            aria-busy={!preferencesReady}
          >
            <LanguageSelect disabled={!preferencesReady} />
            <label>
              {t("pref.appearance")}
              <select
                aria-label={t("pref.appearance")}
                disabled={!preferencesReady}
                value={theme}
                onChange={(e) => appearance(e.target.value)}
              >
                <option value="system">{t("pref.system")}</option>
                <option value="light">{t("pref.light")}</option>
                <option value="dark">{t("pref.dark")}</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                disabled={!preferencesReady}
                checked={effects === "on"}
                onChange={(e) => setEffects(e.target.checked ? "on" : "off")}
              />{" "}
              {t("pref.effects")}
            </label>
            <label>
              <input
                type="checkbox"
                disabled={!preferencesReady}
                checked={sound === "on"}
                onChange={(e) => setSound(e.target.checked ? "on" : "off")}
              />{" "}
              {t("pref.sound")}
            </label>
            <p>{t("pref.note")}</p>
            <p>{t("pref.scope")}</p>
          </aside>
        )}
      </div>
    </Experience.Provider>
  );
}

export function WheatMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 120"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M34 113Q40 70 45 10M36 94Q16 84 14 65Q32 69 38 86M39 76Q59 66 64 47Q47 51 41 69M42 56Q24 45 25 29Q40 34 43 49M45 35Q59 24 56 9Q46 17 45 29M30 112Q28 76 12 44" />
      <path d="M14 65L36 92M64 47L39 76M25 29L42 56M56 9L45 35" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} strokeWidth=".8">
          <path
            d={`M${38 + i * 0.9} ${94 - i * 9}q-15 -5 -12 -13q13 3 12 13M${39 + i * 0.9} ${89 - i * 9}q15 -5 15 -14q-12 4 -15 14`}
          />
          <path
            d={`M${29 + i * 0.9} ${83 - i * 9}l8 8M${43 + i * 0.9} ${85 - i * 9}l8 -8`}
          />
        </g>
      ))}
      <path d="M23 111H50M21 116H52" />
    </svg>
  );
}
export function EditorialHeading({
  number,
  title,
  children,
}: {
  number: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <header className="heritage-editorial-heading">
      <span className="catalogue-eyebrow">
        {t("editorial.number", { number })}
      </span>
      <h2>{title}</h2>
      {children}
    </header>
  );
}
export function HeritageSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`heritage-section ${className}`}>{children}</section>
  );
}

/** One bounded, event-driven burst. No simulation, layout reads in animation loops or authorization role. */
export function DiscoveryLink({
  href,
  children,
  className = "",
  current = false,
}: {
  current?: boolean;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const preferences = useContext(Experience);
  const [burst, setBurst] = useState<{
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      void audio.current?.close().catch(() => {});
    },
    [],
  );
  function activate(event: React.MouseEvent<HTMLAnchorElement>) {
    // Respect reduced motion at the moment of interaction, including changes on an open page.
    if (
      preferences.effects &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const bounds = event.currentTarget.getBoundingClientRect();
      setBurst({
        x: event.detail === 0 ? bounds.width / 2 : event.clientX - bounds.left,
        y: event.detail === 0 ? bounds.height / 2 : event.clientY - bounds.top,
        key: Date.now(),
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setBurst(null), 460);
    }
    // Original synthesized dry-grain sound; never runs for saving, security, focus or passive navigation.
    if (
      preferences.sound &&
      event.isTrusted &&
      typeof window.AudioContext === "function"
    ) {
      try {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        void audio.current?.close().catch(() => {});
        const context = new AudioContext();
        audio.current = context;
        const buffer = context.createBuffer(
          1,
          Math.floor(context.sampleRate * 0.11),
          context.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++)
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
        const source = context.createBufferSource();
        source.buffer = buffer;
        const filter = context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 850;
        filter.Q.value = 0.7;
        const gain = context.createGain();
        gain.gain.value = 0.045;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        void context.resume().catch(() => {});
        source.start();
        source.stop(context.currentTime + 0.12);
        closeTimer.current = setTimeout(() => {
          void context.close().catch(() => {});
          if (audio.current === context) audio.current = null;
        }, 180);
      } catch {
        /* Optional audio must never block the real link. */
      }
    }
  }
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`heritage-discovery ${className}`}
      onClick={activate}
    >
      {children}
      {burst && (
        <span
          key={burst.key}
          className="soil-burst"
          aria-hidden="true"
          style={{ left: burst.x, top: burst.y }}
        >
          {Array.from({ length: 9 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  "--dx": `${(i - 4) * 8}px`,
                  "--dy": `${-12 - (i % 4) * 7}px`,
                  "--twist": `${i * 19}deg`,
                  width: 2 + (i % 3),
                  height: 2 + ((i + 1) % 3),
                  animationDelay: `${(i % 3) * 10}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      )}
    </Link>
  );
}
