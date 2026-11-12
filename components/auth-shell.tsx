import Link from "next/link";
import { HeritageSurface, WheatMark } from "@/components/heritage/experience";
import { readAppearance } from "@/lib/heritage/appearance";
import "@/app/auth.css";

export async function AuthShell({ recovery = false, children }: {
  recovery?: boolean;
  children: React.ReactNode;
}) {
  return (
    <HeritageSurface initialTheme={await readAppearance()} chromeOnly>
      <div className="auth-entry">
        <a className="auth-skip" href="#auth-content">Skip to form</a>
        <header className="auth-masthead">
          <Link href="/" className="auth-brand" aria-label="Hustlen’ home">
            <WheatMark /><span>Hustlen’<small>Lend. Borrow. Grow.</small></span>
          </Link>
          <Link className="auth-return" href="/listings">Back to the marketplace <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="M4 16 16 4M5 4h11v11" /></svg></Link>
        </header>
        <main id="auth-content" className="auth-content" tabIndex={-1}>
          <section className="auth-editorial" aria-labelledby="auth-title">
            <p className="auth-eyebrow">The Hustlen’ account book</p>
            <h1 id="auth-title">{recovery ? <>A little help.<br /><em>A way back.</em></> : <>Good to have<br /><em>you back.</em></>}</h1>
            <p className="auth-introduction">{recovery
              ? "A forgotten password needn’t keep you away. Let’s help you find your way back to your account."
              : "For the things you need. And the good things you can share. Your next exchange begins here."}</p>
            <div className="auth-engraving" aria-hidden="true"><WheatMark /><span>Small things.<br /><em>Thoughtfully shared.</em></span></div>
          </section>
          <section className="auth-sheet" aria-label={recovery ? "Password recovery" : "Sign in"}>
            <p className="auth-eyebrow auth-sheet-number">{recovery ? "02 / Find your way back" : "01 / Your account"}</p>
            {children}
          </section>
        </main>
        <footer className="auth-footer"><span>A little trust. A better exchange.</span><span>Hustlen’ · The everyday, shared.</span></footer>
      </div>
    </HeritageSurface>
  );
}
