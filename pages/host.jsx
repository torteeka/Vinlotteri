/* host.jsx — This Friday's host page */

function HostPage({ state, dispatch, setRoute, showToast }) {
  const friday = thisFriday();
  const fridayISO = isoDate(friday);
  const host = hostAtFriday(state, friday);
  const info = state.hostInfo[fridayISO] || {};
  const [swapOpen, setSwapOpen] = React.useState(false);
  const [swapTarget, setSwapTarget] = React.useState(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ vipps: info.vipps || "", deadline: info.deadline || "", note: info.note || "" });

  React.useEffect(() => {
    setDraft({ vipps: info.vipps || "", deadline: info.deadline || "", note: info.note || "" });
  }, [fridayISO, info.vipps, info.deadline, info.note]);

  // Compute pot for this Friday
  const tickets = state.tickets[fridayISO] || {};
  const totalTickets = Object.values(tickets).reduce((a, b) => a + b, 0);
  const totalKr = totalTickets * 20;
  const buyers = Object.values(tickets).filter((c) => c > 0).length;

  // Countdown to deadline (if set, today)
  const deadlineLabel = info.deadline ? `Deadline · ${info.deadline}` : null;

  const saveInfo = () => {
    dispatch({ type: "SET_HOST_INFO", week: fridayISO, info: draft });
    setEditing(false);
    showToast("Saved");
  };

  const doSwap = () => {
    if (!swapTarget || !host) return;
    dispatch({ type: "SWAP_HOSTS", a: host.id, b: swapTarget, fridayISO });
    setSwapOpen(false);
    setSwapTarget(null);
    showToast("Swapped");
  };

  if (!host) {
    // Either no people yet, or this Friday is skipped.
    if (state.people.length === 0) {
      return (
        <div className="page-shell">
          <PageHeader eyebrow="This Friday" title="Add someone to start" />
          <div className="card">
            <p className="muted">There's no one in the rotation yet. Head over to People to add the team.</p>
            <div style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => setRoute("people")}>Add people →</button>
            </div>
          </div>
        </div>);

    }
    // Skipped Friday.
    const skipInfo = state.skippedFridays?.[fridayISO];
    const nextFri = nextNonSkippedFriday({ ...state, skippedFridays: { ...(state.skippedFridays || {}), [fridayISO]: skipInfo } }, addWeeks(friday, 1));
    const nextHost = hostAtFriday(state, nextFri);
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={`Friday · ${fmtDate(friday)}`}
          title="No lottery this week"
          subtitle={skipInfo?.reason ? `Marked: ${skipInfo.reason}.` : "This Friday is skipped."}
          right={<button className="btn ghost" onClick={() => {dispatch({ type: "UNSKIP_FRIDAY", fridayISO });showToast("Friday restored");}}>↺ Restore Friday</button>} />
        
        <div className="card" style={hostStyles.hero}>
          <div style={hostStyles.heroLeft}>
            <div className="script" style={hostStyles.script}>Next up</div>
            <div style={hostStyles.bigName}>{nextHost?.name || "—"}</div>
            <div className="muted" style={{ fontSize: 16, marginTop: 12 }}>
              {fmtDateLong(nextFri)} · After the weekly meeting
            </div>
          </div>
        </div>
      </div>);

  }

  const hue = avatarHue(host.id);
  const swapName = state.people.find((p) => p.id === swapTarget)?.name;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={`Friday · ${fmtDate(friday)}`}
        title="This Friday's Host"
        right={
        <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" onClick={() => setSwapOpen(true)}>↺ Swap host</button>
            <button className="btn" onClick={() => setRoute("lottery")}>Run lottery →</button>
          </div>
        } />
      

      {/* Hero */}
      <div className="card" style={{ ...hostStyles.hero, ...hostStyles.heroDark }}>
        <div style={hostStyles.heroLeft}>
          <div className="script" style={{ ...hostStyles.script, color: "rgb(242, 124, 161)" }}>It's</div>
          <div style={{ ...hostStyles.bigName, color: "#fbf9ff" }}>{host.name}</div>
          <div style={{ fontSize: 16, marginTop: 12, color: "rgba(255,255,255,0.62)" }}>
            {fmtDateLong(friday)} · After the weekly meeting
          </div>

          <div style={{ ...hostStyles.statRow, borderTopColor: "rgba(255,255,255,0.16)" }}>
            <Stat label="Tickets sold" value={totalTickets} onDark />
            <Stat label="Buyers" value={buyers} onDark />
            <Stat label="Pot so far" value={`${totalKr} kr`} highlight onDark />
            {info.bottles ? <Stat label="Bottles tonight" value={info.bottles} onDark /> : null}
          </div>
        </div>
      </div>

      {/* Host details */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3>Payment & Deadline</h3>
          {!editing &&
          <button className="btn ghost" onClick={() => setEditing(true)}>
              {info.vipps || info.deadline ? "Edit details" : "Add details"}
            </button>
          }
        </div>

        {!editing ?
        <div style={hostStyles.details}>
            <Detail label="Vipps number" value={info.vipps || "—"} mono />
            <Detail label="Pay-by deadline" value={deadlineLabel || "Not set"} />
            <Detail label="Note from host" value={info.note || "—"} wide />
          </div> :

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="label">Vipps number</label>
              <input className="input" inputMode="numeric" placeholder="e.g. 90 12 34 56"
            value={draft.vipps} onChange={(e) => setDraft({ ...draft, vipps: e.target.value })} />
            </div>
            <div>
              <label className="label">Pay-by deadline</label>
              <input className="input" placeholder="e.g. Thursday 12:00"
            value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="label">Note (optional)</label>
              <input className="input" placeholder="“Reds this week, anyone want a sparkling?”"
            value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => {setEditing(false);setDraft({ vipps: info.vipps || "", deadline: info.deadline || "", note: info.note || "" });}}>Cancel</button>
              <button className="btn" onClick={saveInfo}>Save</button>
            </div>
          </div>
        }
      </div>

      {/* Swap modal */}
      <Modal open={swapOpen} onClose={() => {setSwapOpen(false);setSwapTarget(null);}}>
        <div className="eyebrow">Swap host</div>
        <h2 style={{ marginTop: 6 }}>Trade {host.name.split(" ")[0]}'s turn</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          They'll trade positions in the rotation — all future turns swap too.
        </p>
        <PersonPicker people={state.people} value={swapTarget} onChange={setSwapTarget} excludeId={host.id} />
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => {setSwapOpen(false);setSwapTarget(null);}}>Cancel</button>
          <button className="btn" disabled={!swapTarget} onClick={doSwap}>
            {swapName ? `Swap with ${swapName.split(" ")[0]}` : "Pick someone"}
          </button>
        </div>
      </Modal>
    </div>);

}

function Stat({ label, value, highlight, onDark }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="label" style={{ margin: 0, color: onDark ? "rgba(255,255,255,0.55)" : undefined }}>{label}</span>
      <span className={highlight ? "kr-num" : ""} style={{ ...{
          fontFamily: "var(--font-display)",
          fontSize: highlight ? 30 : 26,
          fontWeight: 600,
          color: highlight ? "var(--gold)" : onDark ? "#fbf9ff" : "var(--ink)",
          lineHeight: 1
        }, color: "rgb(240, 115, 154)" }}>{value}</span>
    </div>);

}

function Detail({ label, value, mono, wide }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <div className="label">{label}</div>
      <div className={mono ? "mono" : ""} style={{ fontSize: 18, fontFamily: mono ? "var(--font-mono)" : "var(--font-display)", fontWeight: mono ? 500 : 500 }}>
        {value}
      </div>
    </div>);

}

const hostStyles = {
  hero: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 24,
    padding: "36px 40px",
    background: "linear-gradient(180deg, color-mix(in oklab, var(--paper) 70%, white) 0%, var(--paper-2) 100%)"
  },
  heroDark: {
    background: "linear-gradient(158deg, #322c5e 0%, #1c1838 62%, #15122c 100%)",
    color: "var(--paper)",
    borderColor: "rgba(255,255,255,0.10)",
    boxShadow: "0 1px 0 rgba(255,255,255,.10) inset, 0 24px 60px -28px rgba(20,16,44,.6)"
  },
  heroLeft: { display: "flex", flexDirection: "column", justifyContent: "center" },
  heroRight: { display: "flex", alignItems: "center", justifyContent: "center" },
  script: {
    fontSize: 56, color: "var(--accent)", lineHeight: 1, marginTop: 14, marginBottom: -10
  },
  bigName: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(48px, 6.5vw, 92px)",
    fontWeight: 600,
    lineHeight: 1.02,
    letterSpacing: "-0.02em",
    marginTop: 14,
    color: "var(--ink)"
  },
  statRow: {
    display: "flex", gap: 36, marginTop: 28,
    paddingTop: 20, borderTop: "0.5px solid var(--line-2)"
  },
  details: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18
  }
};

window.HostPage = HostPage;