/* people.jsx — manage rotation */

function PeoplePage({ state, dispatch, showToast }) {
  const [name, setName] = React.useState("");
  const [confirmId, setConfirmId] = React.useState(null);
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState("");
  const [draggingId, setDraggingId] = React.useState(null);
  const [dropTargetId, setDropTargetId] = React.useState(null);

  const submit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: "ADD_PERSON", name });
    setName("");
    showToast(`Added ${name.trim().split(" ")[0]}`);
  };

  const remove = (id) => {
    dispatch({ type: "REMOVE_PERSON", id });
    setConfirmId(null);
    showToast("Removed — schedule redistributed");
  };

  const startEdit = (p) => { setEditingId(p.id); setEditName(p.name); };
  const saveEdit = () => {
    if (editName.trim()) dispatch({ type: "RENAME_PERSON", id: editingId, name: editName.trim() });
    setEditingId(null);
  };

  // Drag-reorder with insertion-line UX. We track the hovered row + whether
  // the cursor is in its top or bottom half — a thin accent line renders at
  // that edge to show where the dragged row will slot in.
  const dragId = React.useRef(null);
  const [hoverHalf, setHoverHalf] = React.useState(null); // 'top' | 'bottom'
  const onDragStart = (id) => (e) => {
    dragId.current = id;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const half = (e.clientY - rect.top) < rect.height / 2 ? "top" : "bottom";
    setDropTargetId(id);
    setHoverHalf(half);
  };
  const onDragLeave = (id) => (e) => {
    if (dropTargetId === id) { setDropTargetId(null); setHoverHalf(null); }
  };
  const onDrop = (id) => (e) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    const from = state.people.findIndex(p => p.id === dragId.current);
    let to = state.people.findIndex(p => p.id === id);
    if (from === -1 || to === -1) return;
    if (hoverHalf === "bottom") to++;
    const next = state.people.slice();
    const [moved] = next.splice(from, 1);
    if (from < to) to--;
    to = Math.max(0, Math.min(next.length, to));
    next.splice(to, 0, moved);
    dispatch({ type: "REORDER_PEOPLE", people: next });
  };
  const onDragEnd = () => {
    dragId.current = null;
    setDraggingId(null);
    setDropTargetId(null);
    setHoverHalf(null);
  };

  const confirmPerson = state.people.find((p) => p.id === confirmId);
  const friday = thisFriday();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="The rotation"
        title="Manage People"
        subtitle="Drag to reorder. The list order is the host rotation."
      />

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap: 24, alignItems:"start"}}>
        <div className="card">
          {state.people.length === 0 && (
            <div className="muted" style={{padding: 30, textAlign:"center"}}>No one in the rotation yet. Add someone below.</div>
          )}
          {state.people.map((p, i) => {
            const upcomingFri = nextHostingFridayForPerson(state, p);
            const isDragging = draggingId === p.id;
            const isDropTarget = dropTargetId === p.id && draggingId !== p.id;
            return (
              <div key={p.id} className={"list-row drag-row" + (isDragging ? " is-dragging" : "") + (isDropTarget ? ` is-drop drop-${hoverHalf}` : "")}
                   draggable
                   onDragStart={onDragStart(p.id)}
                   onDragOver={onDragOver(p.id)}
                   onDragLeave={onDragLeave(p.id)}
                   onDrop={onDrop(p.id)}
                   onDragEnd={onDragEnd}>
                <span className="drag-handle" aria-hidden title="Drag to reorder">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <circle cx="6" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/>
                    <circle cx="6" cy="8" r="1.2"/><circle cx="10" cy="8" r="1.2"/>
                    <circle cx="6" cy="13" r="1.2"/><circle cx="10" cy="13" r="1.2"/>
                  </svg>
                </span>
                <span className="mono muted" style={{width: 22, fontSize: 12, opacity: 0.5}}>{String(i + 1).padStart(2, "0")}</span>
                <Avatar person={p}/>
                {editingId === p.id ? (
                  <input
                    autoFocus
                    className="input"
                    style={{flex:1, fontSize: 18, fontFamily: "var(--font-display)"}}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                  />
                ) : (
                  <div className="grow" style={{display:"flex", alignItems:"center", gap:12}}>
                    <span className="name">{p.name}</span>
                    <span className="pill dim mono" style={{fontSize:10}}>{upcomingFri ? fmtDate(upcomingFri) : "—"}</span>
                  </div>
                )}
                <button className="icon-btn" onClick={() => startEdit(p)} aria-label="Rename" title="Rename">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2 2 0 1 1 2.8 2.8L7 18.6 3 20l1.4-4z"/></svg>
                </button>
                <button className="icon-btn" onClick={() => setConfirmId(p.id)} aria-label="Remove" title="Remove">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4h6v3"/></svg>
                </button>
              </div>
            );
          })}
        </div>

        <div style={{position:"sticky", top: 24}}>
          <div className="card">
            <h3 style={{marginBottom: 4}}>Add someone</h3>
            <p className="muted" style={{fontSize:13, marginBottom: 14}}>
              They'll join the end of the rotation.
            </p>
            <form onSubmit={submit} style={{display:"flex", gap: 8}}>
              <input
                className="input"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="btn" type="submit" disabled={!name.trim()}>Add</button>
            </form>
          </div>

          <div className="card" style={{marginTop: 18}}>
            <h3 style={{marginBottom: 8}}>How removal works</h3>
            <p className="muted" style={{fontSize:13, lineHeight: 1.5}}>
              Removing someone shifts everyone else up in the rotation — their upcoming turns redistribute across the remaining list. Past Fridays in <em>History</em> are unaffected.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)}>
        <div className="eyebrow" style={{color:"var(--accent)"}}>Remove person</div>
        <h2 style={{marginTop:6}}>Remove {confirmPerson?.name}?</h2>
        <p className="muted" style={{marginTop:8, lineHeight: 1.55}}>
          Their position in the rotation will be removed, and everyone after them will shift forward. This can't be undone (but you can always re-add them).
        </p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => setConfirmId(null)}>Cancel</button>
          <button className="btn danger" onClick={() => remove(confirmId)}>Remove</button>
        </div>
      </Modal>
    </div>
  );
}

window.PeoplePage = PeoplePage;
