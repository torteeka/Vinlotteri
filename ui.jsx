/* ui.jsx — shared atoms: Avatar, Modal, Stepper, PageHeader, LabelTop */

function Avatar({ person, size = "md", style }) {
  if (!person) return null;
  const hue = avatarHue(person.id);
  const bg = `oklch(0.42 0.12 ${hue})`;
  const cls = "avatar" + (size === "lg" ? " lg" : size === "xl" ? " xl" : "");
  return (
    <span className={cls} style={{ background: bg, ...(style || {}) }} aria-hidden>
      {initials(person.name)}
    </span>);

}

function Modal({ open, onClose, children, large }) {
  React.useEffect(() => {
    if (!open) return;
    const k = (e) => {if (e.key === "Escape") onClose?.();};
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={"modal" + (large ? " lg" : "")} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>);

}

function Stepper({ value, onChange, min = 0, max = 5 }) {
  return (
    <div className="stepper" role="group">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="decrease">−</button>
      <div className="val">{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="increase">+</button>
    </div>);

}

function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="page-h">
      <div className="left">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 style={{ marginTop: 4 }}>{title}</h1>
        {subtitle && <div className="muted" style={{ fontSize: 16, marginTop: 6, maxWidth: 540 }}>{subtitle}</div>}
      </div>
      {right && <div>{right}</div>}
    </div>);

}

function LabelTop({ children = "Cuvée du Bureau" }) {
  return (
    <div className="label-top">
      <hr />
      <span className="glyph">{children}</span>
      <hr />
    </div>);

}

// Wine bottle SVG — used on hero/lottery
function BottleSVG({ winnerName }) {
  return (
    <svg className="bottle" viewBox="0 0 200 460" fill="none" aria-hidden style={{ strokeWidth: "2px" }}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <path d="M85 6 h30 v66 c0 12 18 22 18 50 v320 c0 9 -7 16 -16 16 h-54 c-9 0 -16 -7 -16 -16 v-320 c0 -28 18 -38 18 -50 z"
      fill="url(#bg)" stroke="currentColor" strokeWidth="1.2" opacity="0.95" style={{ fill: "rgb(100, 100, 100)", stroke: "rgb(177, 92, 92)", opacity: "0.41" }} />
      {/* foil */}
      <rect x="80" y="6" width="40" height="58" fill="currentColor" opacity="0.85" style={{ opacity: "-7.39" }} />
      <rect x="80" y="6" width="40" height="6" fill="rgba(0,0,0,0.25)" />
      {/* label */}
      <rect x="48" y="180" width="104" height="160" fill="rgb(246,239,227)" stroke="rgba(0,0,0,0.15)" />
      <text x="100" y="216" textAnchor="middle" fontFamily="'Italianno', cursive" fontSize="36" fill="rgb(42,20,24)">
        {winnerName || "Vinlotteri"}
      </text>
      <line x1="60" y1="240" x2="140" y2="240" stroke="rgba(42,20,24,0.4)" />
      <text x="100" y="262" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="13" letterSpacing="3" fill="rgb(42,20,24)">
        FRIDAY · RESERVE
      </text>
      <text x="100" y="312" textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize="9" letterSpacing="2" fill="rgba(42,20,24,0.6)">
        BUREAU SELECTION
      </text>
    </svg>);

}

// People selector for swap
function PersonPicker({ people, value, onChange, excludeId }) {
  return (
    <div style={{ display: "grid", gap: 6, maxHeight: 320, overflowY: "auto", marginTop: 8 }}>
      {people.filter((p) => p.id !== excludeId).map((p) =>
      <button
        key={p.id}
        className="list-row"
        onClick={() => onChange(p.id)}
        style={{
          background: value === p.id ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "transparent",
          border: 0, cursor: "pointer", textAlign: "left",
          outline: value === p.id ? "1px solid color-mix(in oklab, var(--accent) 40%, transparent)" : "none"
        }}>
        
          <Avatar person={p} />
          <div className="name small">{p.name}</div>
        </button>
      )}
    </div>);

}

Object.assign(window, { Avatar, Modal, Stepper, PageHeader, LabelTop, BottleSVG, PersonPicker });