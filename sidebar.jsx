/* sidebar.jsx — collapsible sidebar nav */

const NAV = [
{ id: "lottery", label: "Run Lottery", icon: "wheel", featured: true },
{ id: "tickets", label: "Tickets", icon: "ticket" },
{ id: "schedule", label: "Schedule", icon: "calendar" },
{ id: "people", label: "People", icon: "people" },
{ id: "history", label: "History", icon: "history" }];


function NavIcon({ kind }) {
  const s = { width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (kind) {
    case "host":
      return <svg viewBox="0 0 24 24" {...s}><path d="M12 3l8 5v11a1 1 0 0 1-1 1h-5v-7h-4v7H5a1 1 0 0 1-1-1V8l8-5z" /></svg>;
    case "wheel":
      return <svg viewBox="0 0 24 24" {...s}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v9l6.5 6.5M12 12L5.5 18.5M12 12l8.5-3" />
      </svg>;
    case "ticket":
      return <svg viewBox="0 0 24 24" {...s}><path d="M3 9a2 2 0 0 0 2-2V5h14v2a2 2 0 1 0 0 4v6a2 2 0 0 0-2 2v0H5v0a2 2 0 0 0-2-2V9z" /><path d="M9 5v14" strokeDasharray="2 2" /></svg>;
    case "calendar":
      return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>;
    case "people":
      return <svg viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.7-3.4 3.2-5 6-5s5.3 1.6 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14c2.4.2 4.3 1.8 5 5" /></svg>;
    case "history":
      return <svg viewBox="0 0 24 24" {...s}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></svg>;
    default:
      return null;
  }
}

function Sidebar({ route, setRoute, collapsed, setCollapsed }) {
  return (
    <aside className="sidebar" style={{ ...sideStyle.aside, padding: "85.1055px 14px 20px", borderRadius: "0px" }}>
      <div style={sideStyle.head}>
        <div style={sideStyle.brand} onClick={() => setRoute("host")}>
          <span style={sideStyle.mark} aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 5v11a1 1 0 0 1-1 1h-5v-7h-4v7H5a1 1 0 0 1-1-1V8l8-5z" />
            </svg>
          </span>
          {!collapsed &&
          <span style={sideStyle.brandText}>
              <span className="display" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, lineHeight: 1 }}>Vinlotteri</span>
              <span className="muted mono" style={{ fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase" }}>DRAMMEN</span>
            </span>
          }
        </div>
        <button className="icon-btn" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar" style={sideStyle.collapseBtn}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ?
            <path d="M9 6l6 6-6 6" /> :
            <path d="M15 6l-6 6 6 6" />}
          </svg>
        </button>
      </div>

      <nav style={sideStyle.nav}>
        {NAV.map((item) => {
          const active = route === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className="sb-item"
              data-active={active ? "1" : "0"}
              data-featured={item.featured ? "1" : "0"}
              title={collapsed ? item.label : undefined}
              style={{
                ...sideStyle.item,
                ...(active ? sideStyle.itemActive : null),
                ...(item.featured ? sideStyle.itemFeatured : null),
                ...(item.featured && active ? sideStyle.itemFeaturedActive : null),
                justifyContent: collapsed ? "center" : "flex-start"
              }}>
              
              <NavIcon kind={item.icon} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.featured && <span style={sideStyle.dot} aria-hidden>•</span>}
            </button>);

        })}
      </nav>

      <div style={{ flex: 1, height: "378px" }} />
      {!collapsed &&
      <div style={sideStyle.foot}>
          <div className="script" style={{ fontSize: 34, lineHeight: 1, color: "var(--accent)" }}>Skål.</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Every Friday, after the meeting.</div>
        </div>
      }
    </aside>);

}

const sideStyle = {
  aside: {
    background: "color-mix(in oklab, var(--paper-2) 70%, var(--paper))",
    borderRight: "0.5px solid var(--line-2)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 14px",
    gap: 4,
    position: "sticky",
    top: 0,
    height: "100vh",
    zIndex: 5
  },
  head: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 6px 18px",
    borderBottom: "0.5px solid var(--line-2)",
    marginBottom: 14
  },
  brand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "var(--accent)" },
  mark: { display: "flex", alignItems: "center", justifyContent: "center" },
  brandText: { display: "flex", flexDirection: "column", color: "var(--ink)" },
  collapseBtn: { color: "var(--ink)" },
  nav: { display: "flex", flexDirection: "column", gap: 2 },
  item: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 12px",
    border: 0, background: "transparent",
    color: "color-mix(in oklab, var(--ink) 78%, transparent)",
    font: "500 13.5px var(--font-body)",
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "left",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  itemActive: {
    background: "color-mix(in oklab, var(--paper) 50%, white)",
    color: "var(--accent)",
    boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 14px -8px rgba(0,0,0,.25)"
  },
  itemFeatured: {
    background: "var(--ink)",
    color: "var(--paper)",
    marginTop: 6,
    marginBottom: 6,
    padding: "12px 12px"
  },
  itemFeaturedActive: {
    background: "var(--accent)",
    color: "var(--accent-ink)",
    boxShadow: "0 6px 18px -8px var(--accent-2)"
  },
  dot: { marginLeft: "auto", color: "var(--gold)", fontSize: 18, lineHeight: 0 },
  foot: { padding: "14px 8px 0", borderTop: "0.5px solid var(--line-2)", marginTop: 10 }
};

// Inject style for sidebar item hover
(function injectSidebarStyle() {
  if (document.getElementById("sb-style")) return;
  const s = document.createElement("style");
  s.id = "sb-style";
  s.textContent = `
    .sb-item:hover { background: color-mix(in oklab, var(--accent) 8%, transparent); color: var(--accent); }
    .sb-item[data-featured="1"]:hover { background: var(--accent-2); color: var(--accent-ink); }
    .sb-item[data-featured="1"][data-active="1"]:hover { background: var(--accent-2); }
  `;
  document.head.appendChild(s);
})();

window.Sidebar = Sidebar;