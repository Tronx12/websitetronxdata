// export default function Home() {
//   return (
//     <main className="site-shell bg-white">
//       <nav className="nav-wrap" aria-label="Main navigation">
//         <a className="brand" href="#top" aria-label="Tronx home">
//           <img src="/2.svg" alt="Tronx" className="h-36 w-36" />
//         </a>
//         <div className="nav-links"><a href="#product">Product</a><a href="#workflow">Workflow</a><a href="#stories">Stories</a></div>
//         <div className="nav-actions"><a className="login-link" href="/login">Log in</a><a className="button button-small" href="/register">Get started <span aria-hidden="true">→</span></a></div>
//       </nav>

//       <section className="hero" id="top">
//         <div className="hero-copy">
//           <p className="eyebrow"><span className="eyebrow-line" /> CRM for teams in motion</p>
//           <h4>Make every<br /><em>connection</em> count.</h4>
//           <p className="hero-description">Tronx brings your people, pipeline, and next best action into one clear view, so your team can spend less time updating tools and more time moving work forward.</p>
//           <div className="hero-actions"><a className="button" href="/login">Start for free <span aria-hidden="true">-&gt;</span></a><a className="text-link" href="#product">Explore the platform <span aria-hidden="true">↗</span></a></div>
//           <div className="proof-row"><div className="avatar-stack"><span>AM</span><span>JK</span><span>RS</span><span>+</span></div><p>Trusted by 2,000+ growing teams</p></div>
//         </div>

//         <div className="hero-visual" aria-label="Tronx workspace preview">
//           <div className="visual-glow" />
//           <div className="dashboard-card">
//             <div className="dash-topbar">
//               <div className="mini-brand"><span className="mini-mark">T</span> tronx</div>
//               <div className="dash-top-actions"><span className="search-pill">Search anything <b>/</b></span><span className="notification-dot" /></div>
//             </div>
//             <div className="dash-body">
//               <aside className="dash-sidebar"><span className="side-icon active">⌂</span><span className="side-icon">▦</span><span className="side-icon">◎</span><span className="side-icon">◒</span><span className="side-icon">⚙</span></aside>
//               <div className="dash-content">
//                 <div className="dash-heading"><div><span className="dash-kicker">Tuesday, October 08</span><h2>Good morning, Amina</h2></div><button className="add-button">+ Add new</button></div>
//                 <div className="metric-grid">
//                   <div className="metric"><span>Open pipeline</span><strong>$248.6k</strong><small className="positive">↑ 18.4%</small></div>
//                   <div className="metric"><span>Won this month</span><strong>$72.4k</strong><small className="positive">↑ 12.8%</small></div>
//                   <div className="metric"><span>Active deals</span><strong>42</strong><small className="muted">8 closing soon</small></div>
//                 </div>
//                 <div className="dash-lower">
//                   <div className="chart-panel"><div className="panel-title"><strong>Pipeline velocity</strong><span>Last 30 days ˅</span></div><div className="chart"><i className="chart-line" /><div className="chart-labels"><span>Sep 08</span><span>Sep 22</span><span>Oct 08</span></div></div></div>
//                   <div className="activity-panel"><div className="panel-title"><strong>Next up</strong><span>View all</span></div><div className="activity-item"><span className="activity-avatar coral">JL</span><p>Follow up with <b>Jules Lee</b><small>Today, 10:30 AM</small></p><span className="activity-arrow">→</span></div><div className="activity-item"><span className="activity-avatar blue">RK</span><p>Proposal review <b>Ravi Kumar</b><small>Today, 2:00 PM</small></p><span className="activity-arrow">→</span></div></div>
//                 </div>
//               </div>
//             </div>
//           </div>
//           <div className="floating-note"><span className="checkmark">✓</span><p><b>Deal moved forward</b><small>Acme Inc. · $24,000</small></p></div>
//         </div>
//       </section>

//       <section className="logo-strip" id="product"><span>Teams building what&apos;s next with Tronx</span><div className="logo-list"><b>northstar</b><b className="serif-logo">arc<span>°</span></b><b>lattice<span className="logo-plus">+</span></b><b className="wide-logo">KINSHIP</b><b>Layer<span className="layer-dot">●</span></b></div></section>

//       <section className="feature-band" id="workflow"><div><p className="eyebrow"><span className="eyebrow-line" /> One workspace, zero guesswork</p><h2>Clarity is a<br /><em>growth strategy.</em></h2></div><p className="feature-intro">The best teams do not work harder to stay aligned. They build a system that makes alignment the default.</p><div className="feature-grid"><article><span className="feature-number">01</span><h3>See the signal</h3><p>Know what matters now with a living view of every relationship and opportunity.</p><a href="/login">Explore insights <span>↗</span></a></article><article><span className="feature-number">02</span><h3>Move as one</h3><p>Give every teammate the context they need to make the next move confidently.</p><a href="/register">Explore workflows <span>↗</span></a></article><article><span className="feature-number">03</span><h3>Grow on purpose</h3><p>Turn your team&apos;s best habits into repeatable momentum that compounds over time.</p><a href="/register">Explore analytics <span>↗</span></a></article></div></section>

//       <section className="closing-cta" id="stories"><p className="eyebrow"><span className="eyebrow-line" /> Your next chapter starts here</p><h2>Work that feels<br /><em>in motion.</em></h2><a className="button button-light bg-blue-400" href="/register">Build your workspace <span aria-hidden="true">-&gt;</span></a></section>
//     </main>
//   );
// }

export default function Home() {
  return (
    <main className="site-shell bg-white">
      <nav className="nav-wrap" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Tronx home">
          <img src="/2.svg" alt="Tronx" className="h-14 w-48" />
        </a>
        <div className="nav-links"><a href="#product">Product</a><a href="#workflow">Workflow</a><a href="#stories">Stories</a></div>
        <div className="nav-actions"><a className="login-link" href="/login">Log in</a><a className="button button-small" href="/register">Get started <span aria-hidden="true">→</span></a></div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> CRM for teams in motion</p>
          <h4>Make every<br /><em>connection</em> count.</h4>
          <p className="hero-description">Tronx brings your people, pipeline, and next best action into one clear view, so your team can spend less time updating tools and more time moving work forward.</p>
          <div className="hero-actions"><a className="button" href="/login">Start for free <span aria-hidden="true">-&gt;</span></a><a className="text-link" href="#product">Explore the platform <span aria-hidden="true">↗</span></a></div>
          <div className="proof-row"><div className="avatar-stack"><span>AM</span><span>JK</span><span>RS</span><span>+</span></div><p>Trusted by 2,000+ growing teams</p></div>
        </div>

        <div className="hero-visual" aria-label="Tronx workspace preview">
          <div className="visual-glow" />
          <div className="dashboard-card">
            <div className="dash-topbar">
              {/* <div className="mini-brand"><span className="mini-mark">T</span> tronx</div> */}
              <a className="brand" href="#top" aria-label="Tronx home">
                <img src="/2.svg" alt="Tronx" className="h-10 w-32"/>
              </a>
              <div className="dash-top-actions"><span className="search-pill">Search anything <b>/</b></span><span className="notification-dot" /></div>
            </div>
            <div className="dash-body">
              <aside className="dash-sidebar"><span className="side-icon active">⌂</span><span className="side-icon">▦</span><span className="side-icon">◎</span><span className="side-icon">◒</span><span className="side-icon">⚙</span></aside>
              <div className="dash-content">
                <div className="dash-heading"><div><span className="dash-kicker">Tuesday, October 08</span><h2>Good morning, Amina</h2></div><button className="add-button">+ Add new</button></div>
                <div className="metric-grid">
                  <div className="metric"><span>Open pipeline</span><strong>$248.6k</strong><small className="positive">↑ 18.4%</small></div>
                  <div className="metric"><span>Won this month</span><strong>$72.4k</strong><small className="positive">↑ 12.8%</small></div>
                  <div className="metric"><span>Active deals</span><strong>42</strong><small className="muted">8 closing soon</small></div>
                </div>
                <div className="dash-lower">
                  <div className="chart-panel"><div className="panel-title"><strong>Pipeline velocity</strong><span>Last 30 days ˅</span></div><div className="chart"><i className="chart-line" /><div className="chart-labels"><span>Sep 08</span><span>Sep 22</span><span>Oct 08</span></div></div></div>
                  <div className="activity-panel"><div className="panel-title"><strong>Next up</strong><span>View all</span></div><div className="activity-item"><span className="activity-avatar coral">JL</span><p>Follow up with <b>Jules Lee</b><small>Today, 10:30 AM</small></p><span className="activity-arrow">→</span></div><div className="activity-item"><span className="activity-avatar blue">RK</span><p>Proposal review <b>Ravi Kumar</b><small>Today, 2:00 PM</small></p><span className="activity-arrow">→</span></div></div>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-note"><span className="checkmark">✓</span><p><b>Deal moved forward</b><small>Acme Inc. · $24,000</small></p></div>
        </div>
      </section>

      <section className="logo-strip" id="product"><span>Teams building what&apos;s next with Tronx</span><div className="logo-list"><b>northstar</b><b className="serif-logo">arc<span>°</span></b><b>lattice<span className="logo-plus">+</span></b><b className="wide-logo">KINSHIP</b><b>Layer<span className="layer-dot">●</span></b></div></section>

      <section className="feature-band" id="workflow"><div><p className="eyebrow"><span className="eyebrow-line" /> One workspace, zero guesswork</p><h2>Clarity is a<br /><em>growth strategy.</em></h2></div><p className="feature-intro">The best teams do not work harder to stay aligned. They build a system that makes alignment the default.</p><div className="feature-grid"><article><span className="feature-number">01</span><h3>See the signal</h3><p>Know what matters now with a living view of every relationship and opportunity.</p><a href="/login">Explore insights <span>↗</span></a></article><article><span className="feature-number">02</span><h3>Move as one</h3><p>Give every teammate the context they need to make the next move confidently.</p><a href="/register">Explore workflows <span>↗</span></a></article><article><span className="feature-number">03</span><h3>Grow on purpose</h3><p>Turn your team&apos;s best habits into repeatable momentum that compounds over time.</p><a href="/register">Explore analytics <span>↗</span></a></article></div></section>

      <section className="closing-cta" id="stories"><p className="eyebrow"><span className="eyebrow-line" /> Your next chapter starts here</p><h2>Work that feels<br /><em>in motion.</em></h2><a className="button button-light" href="/register">Build your workspace <span aria-hidden="true">-&gt;</span></a></section>
    </main>
  );
}