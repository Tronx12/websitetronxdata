// components/auth/AuthShell.tsx
import Link from "next/link";

export default function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <main className="auth-shell">
      <div className="auth-bg" />
      <div className="auth-inner">
        <header className="auth-header">
                         <a className="brand " href="#top" aria-label="Tronx home">
  <img src="/2.svg" alt="Tronx" className="bg-white rounded-lg w-36 h-12 flex items-center" />
</a>
        </header>

        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-card-head">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                Tronx CRM
              </p>
              <h4>{title}</h4>
              {subtitle && <p className="auth-subtitle">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>

        <footer className="auth-footer">
          <p>
            By continuing you agree to the{" "}
            <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
        </footer>
      </div>
    </main>
  );
}