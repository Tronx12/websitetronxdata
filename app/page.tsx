
// app/page.tsx

import { headers } from "next/headers";
import { connectDB } from "@/config/db";
import IpWhitelist from "@/models/IpWhitelist";

export const dynamic = "force-dynamic";

/**
 * Check whether an IP is localhost.
 */
function isLocalIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();

  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "::ffff:127.0.0.1"
  );
}

/**
 * Get public IP for LOCAL DEVELOPMENT only.
 *
 * When running:
 *
 *   http://localhost:3000
 *
 * Next.js may see:
 *
 *   127.0.0.1
 *   ::1
 *
 * instead of your public IP.
 *
 * This fallback gets the public IP of the
 * same machine running the Next.js server.
 */
async function getDevelopmentPublicIp(): Promise<string> {
  try {
    const response = await fetch(
      "https://api.ipify.org",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Unable to get development public IP"
      );

      return "";
    }

    const ip = (await response.text()).trim();

    console.log(
      "DEVELOPMENT PUBLIC IP:",
      ip
    );

    return ip;
  } catch (error) {
    console.error(
      "DEVELOPMENT PUBLIC IP ERROR:",
      error
    );

    return "";
  }
}

/**
 * Get visitor/client IP.
 *
 * Production:
 *   x-forwarded-for
 *   x-real-ip
 *
 * Development:
 *   localhost -> public IP lookup
 */
async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();

  /*
   * x-forwarded-for
   */
  const forwardedFor =
    requestHeaders.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")[0]
      .trim();

    if (firstIp) {
      console.log(
        "X-FORWARDED-FOR:",
        firstIp
      );

      /*
       * Local development.
       */
      if (
        process.env.NODE_ENV !== "production" &&
        isLocalIp(firstIp)
      ) {
        console.log(
          "LOCALHOST DETECTED"
        );

        console.log(
          "Getting public IP..."
        );

        return await getDevelopmentPublicIp();
      }

      return firstIp;
    }
  }

  /*
   * x-real-ip
   */
  const realIp =
    requestHeaders.get("x-real-ip");

  if (realIp) {
    const ip = realIp.trim();

    console.log(
      "X-REAL-IP:",
      ip
    );

    /*
     * Local development.
     */
    if (
      process.env.NODE_ENV !== "production" &&
      isLocalIp(ip)
    ) {
      console.log(
        "LOCALHOST DETECTED"
      );

      console.log(
        "Getting public IP..."
      );

      return await getDevelopmentPublicIp();
    }

    return ip;
  }

  /*
   * No proxy headers.
   *
   * This commonly happens with localhost.
   */
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "NO CLIENT IP HEADER FOUND"
    );

    console.log(
      "Getting development public IP..."
    );

    return await getDevelopmentPublicIp();
  }

  /*
   * Production fail closed.
   */
  return "";
}

/**
 * Check the current IP against MongoDB whitelist.
 */
async function isIpAllowed(): Promise<boolean> {
  try {
    const clientIp =
      await getClientIp();

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "       TRONX IP WHITELIST CHECK"
    );
    console.log(
      "========================================"
    );

    console.log(
      "Environment:",
      process.env.NODE_ENV
    );

    console.log(
      "Client Public IP:",
      clientIp
    );

    /*
     * No IP = deny.
     */
    if (!clientIp) {
      console.log(
        "RESULT: DENIED"
      );

      console.log(
        "Reason: IP NOT FOUND"
      );

      console.log(
        "========================================"
      );

      return false;
    }

    /*
     * Connect MongoDB.
     */
    await connectDB();

    /*
     * Find active whitelist record.
     */
    const whitelistRecord =
      await IpWhitelist.findOne({
        ipAddress: clientIp,
        isActive: true,
      }).lean();

    const allowed =
      Boolean(whitelistRecord);

    console.log(
      "MongoDB IP:",
      whitelistRecord?.ipAddress ||
        "NOT FOUND"
    );

    console.log(
      "Network:",
      whitelistRecord?.name ||
        "NOT FOUND"
    );

    console.log(
      "Active:",
      whitelistRecord?.isActive ??
        false
    );

    console.log(
      "RESULT:",
      allowed
        ? "✅ ALLOWED"
        : "❌ DENIED"
    );

    console.log(
      "========================================"
    );

    return allowed;
  } catch (error) {
    console.error(
      "HOME IP WHITELIST ERROR:",
      error
    );

    /*
     * Security:
     * If the whitelist check fails,
     * access is denied.
     */
    return false;
  }
}

/**
 * Access denied screen.
 *
 * This is a Server Component.
 * Therefore NO onClick/window usage here.
 */
function AccessDenied() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">

          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl font-bold text-red-600">
              !
            </span>
          </div>

          {/* Heading */}
          <h3 className="text-2xl font-bold text-gray-900">
            Access Restricted
          </h3>

          {/* Description */}
          <p className="mt-4 text-gray-600">
            Your current network is not authorized
            to access the Tronx application.
          </p>

          {/* Network information */}
          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              Office network required
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Please connect to an authorized
              office Wi-Fi/network and try again.
            </p>
          </div>

          {/* Refresh */}
          <a
            href="/"
            className="mt-6 block w-full rounded-lg bg-red-400 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-300"
          >
            Check Network Again
          </a>

          {/* Help */}
          <p className="mt-5 text-xs text-gray-400">
            If you are connected to an office
            network and still see this message,
            please contact your administrator.
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * Home Page
 */
export default async function Home() {
  /*
   * IMPORTANT:
   *
   * IP is checked BEFORE the homepage
   * is rendered.
   */
  const ipAllowed =
    await isIpAllowed();

  /*
   * Unauthorized IP.
   */
  if (!ipAllowed) {
    return <AccessDenied />;
  }

  /*
   * Authorized IP.
   */
  return (
    <main className="site-shell bg-white">

      {/* =========================
          NAVIGATION
      ========================= */}
      <nav
        className="nav-wrap"
        aria-label="Main navigation"
      >
        <a
          className="brand"
          href="#top"
          aria-label="Tronx home"
        >
          <img
            src="/2.svg"
            alt="Tronx"
            className="h-14 w-48"
          />
        </a>

        <div className="nav-links">
          <a href="#product">
            Product
          </a>

          <a href="#workflow">
            Workflow
          </a>

          <a href="#stories">
            Stories
          </a>
        </div>

        <div className="nav-actions">
          <a
            className="login-link"
            href="/login"
          >
            Log in
          </a>

          <a
            className="button button-small"
            href="/register"
          >
            Get started{" "}
            <span aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </nav>

      {/* =========================
          HERO
      ========================= */}
      <section
        className="hero"
        id="top"
      >
        <div className="hero-copy">

          <p className="eyebrow">
            <span className="eyebrow-line" />
            CRM for teams in motion
          </p>

          <h4>
            Make every
            <br />
            <em>connection</em> count.
          </h4>

          <p className="hero-description">
            Tronx brings your people, pipeline,
            and next best action into one clear
            view, so your team can spend less time
            updating tools and more time moving
            work forward.
          </p>

          <div className="hero-actions">
            <a
              className="button"
              href="/login"
            >
              Start for free{" "}
              <span aria-hidden="true">
                -&gt;
              </span>
            </a>

            <a
              className="text-link"
              href="#product"
            >
              Explore the platform{" "}
              <span aria-hidden="true">
                ↗
              </span>
            </a>
          </div>

          <div className="proof-row">
            <div className="avatar-stack">
              <span>AM</span>
              <span>JK</span>
              <span>RS</span>
              <span>+</span>
            </div>

            <p>
              Trusted by 2,000+ growing teams
            </p>
          </div>
        </div>

        {/* =========================
            HERO VISUAL
        ========================= */}
        <div
          className="hero-visual"
          aria-label="Tronx workspace preview"
        >
          <div className="visual-glow" />

          <div className="dashboard-card">

            <div className="dash-topbar">
              <a
                className="brand"
                href="#top"
                aria-label="Tronx home"
              >
                <img
                  src="/2.svg"
                  alt="Tronx"
                  className="h-10 w-32"
                />
              </a>

              <div className="dash-top-actions">
                <span className="search-pill">
                  Search anything <b>/</b>
                </span>

                <span className="notification-dot" />
              </div>
            </div>

            <div className="dash-body">

              <aside className="dash-sidebar">
                <span className="side-icon active">
                  ⌂
                </span>

                <span className="side-icon">
                  ▦
                </span>

                <span className="side-icon">
                  ◎
                </span>

                <span className="side-icon">
                  ◒
                </span>

                <span className="side-icon">
                  ⚙
                </span>
              </aside>

              <div className="dash-content">

                <div className="dash-heading">
                  <div>
                    <span className="dash-kicker">
                      Tuesday, October 08
                    </span>

                    <h2>
                      Good morning, Amina
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="add-button"
                  >
                    + Add new
                  </button>
                </div>

                {/* Metrics */}
                <div className="metric-grid">

                  <div className="metric">
                    <span>
                      Open pipeline
                    </span>

                    <strong>
                      $248.6k
                    </strong>

                    <small className="positive">
                      ↑ 18.4%
                    </small>
                  </div>

                  <div className="metric">
                    <span>
                      Won this month
                    </span>

                    <strong>
                      $72.4k
                    </strong>

                    <small className="positive">
                      ↑ 12.8%
                    </small>
                  </div>

                  <div className="metric">
                    <span>
                      Active deals
                    </span>

                    <strong>
                      42
                    </strong>

                    <small className="muted">
                      8 closing soon
                    </small>
                  </div>

                </div>

                {/* Lower dashboard */}
                <div className="dash-lower">

                  <div className="chart-panel">

                    <div className="panel-title">
                      <strong>
                        Pipeline velocity
                      </strong>

                      <span>
                        Last 30 days ˅
                      </span>
                    </div>

                    <div className="chart">
                      <i className="chart-line" />

                      <div className="chart-labels">
                        <span>
                          Sep 08
                        </span>

                        <span>
                          Sep 22
                        </span>

                        <span>
                          Oct 08
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Activity */}
                  <div className="activity-panel">

                    <div className="panel-title">
                      <strong>
                        Next up
                      </strong>

                      <span>
                        View all
                      </span>
                    </div>

                    <div className="activity-item">

                      <span className="activity-avatar coral">
                        JL
                      </span>

                      <p>
                        Follow up with{" "}
                        <b>
                          Jules Lee
                        </b>

                        <small>
                          Today, 10:30 AM
                        </small>
                      </p>

                      <span className="activity-arrow">
                        →
                      </span>
                    </div>

                    <div className="activity-item">

                      <span className="activity-avatar blue">
                        RK
                      </span>

                      <p>
                        Proposal review{" "}
                        <b>
                          Ravi Kumar
                        </b>

                        <small>
                          Today, 2:00 PM
                        </small>
                      </p>

                      <span className="activity-arrow">
                        →
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating note */}
          <div className="floating-note">

            <span className="checkmark">
              ✓
            </span>

            <p>
              <b>
                Deal moved forward
              </b>

              <small>
                Acme Inc. · $24,000
              </small>
            </p>
          </div>
        </div>
      </section>

      {/* =========================
          LOGO STRIP
      ========================= */}
      <section
        className="logo-strip"
        id="product"
      >
        <span>
          Teams building what&apos;s next with
          Tronx
        </span>

        <div className="logo-list">

          <b>
            northstar
          </b>

          <b className="serif-logo">
            arc
            <span>°</span>
          </b>

          <b>
            lattice
            <span className="logo-plus">
              +
            </span>
          </b>

          <b className="wide-logo">
            KINSHIP
          </b>

          <b>
            Layer
            <span className="layer-dot">
              ●
            </span>
          </b>

        </div>
      </section>

      {/* =========================
          FEATURES
      ========================= */}
      <section
        className="feature-band"
        id="workflow"
      >

        <div>

          <p className="eyebrow">
            <span className="eyebrow-line" />
            One workspace, zero guesswork
          </p>

          <h2>
            Clarity is a
            <br />
            <em>
              growth strategy.
            </em>
          </h2>

        </div>

        <p className="feature-intro">
          The best teams do not work harder
          to stay aligned. They build a system
          that makes alignment the default.
        </p>

        <div className="feature-grid">

          <article>
            <span className="feature-number">
              01
            </span>

            <h3>
              See the signal
            </h3>

            <p>
              Know what matters now with a
              living view of every relationship
              and opportunity.
            </p>

            <a href="/login">
              Explore insights{" "}
              <span>
                ↗
              </span>
            </a>
          </article>

          <article>
            <span className="feature-number">
              02
            </span>

            <h3>
              Move as one
            </h3>

            <p>
              Give every teammate the context
              they need to make the next move
              confidently.
            </p>

            <a href="/register">
              Explore workflows{" "}
              <span>
                ↗
              </span>
            </a>
          </article>

          <article>
            <span className="feature-number">
              03
            </span>

            <h3>
              Grow on purpose
            </h3>

            <p>
              Turn your team&apos;s best habits
              into repeatable momentum that
              compounds over time.
            </p>

            <a href="/register">
              Explore analytics{" "}
              <span>
                ↗
              </span>
            </a>
          </article>

        </div>
      </section>

      {/* =========================
          CLOSING CTA
      ========================= */}
      <section
        className="closing-cta"
        id="stories"
      >

        <p className="eyebrow">
          <span className="eyebrow-line" />
          Your next chapter starts here
        </p>

        <h2>
          Work that feels
          <br />
          <em>
            in motion.
          </em>
        </h2>

        <a
          className="button button-light"
          href="/register"
        >
          Build your workspace{" "}
          <span aria-hidden="true">
            -&gt;
          </span>
        </a>

      </section>

    </main>
  );
}

