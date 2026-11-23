(() => {
  let week = null;
  let items = [];
  let editing = null;
  let editImage = "";
  let weeksInfo = [];          // [{key, count}] newest first
  let currentKey = null;
  let requesters = null;       // null = not loaded yet, "error" = failed
  let view = "month";
  const openMonths = new Set();
  let firstLoad = true;

  const London = "Europe/London";
  const stamp = (iso) => new Intl.DateTimeFormat("en-GB", {
    timeZone: London, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(iso));

  // dd/mm/yyyy hh:mm – Excel (UK) reads this as a proper date and time
  function excelStamp(iso) {
    const p = {};
    for (const x of new Intl.DateTimeFormat("en-GB", {
      timeZone: London, day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(iso))) p[x.type] = x.value;
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
  }

  const shortDate = (key) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" })
    .format(new Date(key + "T00:00:00Z"));
  const endKey = (key) => {
    const d = new Date(key + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  };

  const addDays = (key, n) => {
    const d = new Date(key + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const plural = (n) => `${n} request${n === 1 ? "" : "s"}`;
  const monthLong = (m) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" })
    .format(new Date(m + "-01T00:00:00Z"));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthShort = (m) => MONTHS[Number(m.slice(5, 7)) - 1];

  function setNote(text, kind) { $("cmsg").textContent = text; $("cmsg").className = "msg " + (kind || ""); }

  async function post(payload) {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: { error: "No connection. Please try again." } };
    }
  }

  // ---------- Loading and drawing ----------
  async function load(w) {
    let data;
    try {
      const res = await fetch("/api/list" + (w ? "?week=" + encodeURIComponent(w) : ""), { cache: "no-store" });
      data = await res.json();
      if (!res.ok) throw new Error();
    } catch {
      $("empty").textContent = "Could not load the list. Please refresh the page.";
      $("empty").style.display = "block";
      return;
    }
    $("empty").textContent = "No requests submitted in this week yet.";
    week = data.week;
    items = data.items;
    weeksInfo = data.weeks;
    currentKey = data.current;
    if (firstLoad) { openMonths.add(currentKey.slice(0, 7)); firstLoad = false; }
    openMonths.add(week.slice(0, 7));

    drawWeeks();
    drawDash();
    drawTable();
  }

  // Weeks grouped under months. Each box shows how many requests that week holds.
  function drawWeeks() {
    const groups = new Map();
    for (const w of weeksInfo) {
      const m = w.key.slice(0, 7);
      if (!groups.has(m)) groups.set(m, []);
      groups.get(m).push(w);
    }
    $("weeks").innerHTML = [...groups.keys()].sort().reverse().map((m) => {
      const list = groups.get(m);
      const open = openMonths.has(m);
      return `<div class="month">
        <button type="button" class="monthhead" data-month="${m}" aria-expanded="${open}">
          <span class="chev" aria-hidden="true">▾</span><span>${esc(monthLong(m))}</span>
        </button>
        <div class="monthweeks"${open ? "" : " hidden"}>
          ${list.map((w) => `<button type="button" class="weekbtn ${w.key === week ? "active" : ""}" data-week="${esc(w.key)}">
            ${esc(shortDate(w.key))} – ${esc(shortDate(endKey(w.key)))}
            <small>${w.key === currentKey ? "Current week" : "Past week"} · ${esc(plural(w.count))}</small>
          </button>`).join("")}
        </div>
      </div>`;
    }).join("");
  }

  // ---------- Small dashboard ----------
  const VIEWS = {
    month: { title: "Requests by month", note: "Last 6 months. A week counts in the month it starts." },
    week: { title: "Requests by week", note: "Last 8 weeks (week starting Monday). Tap a bar to open that week." },
    requester: { title: "Requests by requester", note: "All time, most requests first." },
  };

  const BAR_MAX = () => (window.matchMedia("(max-width: 900px)").matches ? 135 : 180);

  function columns(data, opts = {}) {
    const max = Math.max(1, ...data.map((d) => d.value));
    return '<div class="cols">' + data.map((d) => {
      const h = d.value ? Math.max(4, Math.round(BAR_MAX() * d.value / max)) : 2;
      const cls = "col" + (d.now ? " now" : "") + (d.sel ? " sel" : "");
      const inner = `<span class="val">${d.value}</span><span class="bar" style="height:${h}px"></span><span class="lab">${esc(d.label)}</span>`;
      return opts.click
        ? `<button type="button" class="${cls}" data-week="${esc(d.key)}" title="${esc(d.tip)}">${inner}</button>`
        : `<div class="${cls}" title="${esc(d.tip)}">${inner}</div>`;
    }).join("") + "</div>";
  }

  function drawDash() {
    document.querySelectorAll(".segbtn").forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    });
    $("dash-title").textContent = VIEWS[view].title;
    $("dash-note").textContent = VIEWS[view].note;
    $("chart").closest(".dash").dataset.view = view;

    const byWeek = new Map(weeksInfo.map((w) => [w.key, w.count]));
    let html = "";
    let table = [];   // same numbers as text, for screen readers

    if (view === "month" && currentKey) {
      const byMonth = new Map();
      for (const w of weeksInfo) byMonth.set(w.key.slice(0, 7), (byMonth.get(w.key.slice(0, 7)) || 0) + w.count);
      let [y, m] = currentKey.slice(0, 7).split("-").map(Number);
      const months = [];
      for (let i = 0; i < 6; i++) { months.unshift(`${y}-${String(m).padStart(2, "0")}`); m--; if (m === 0) { m = 12; y--; } }
      const data = months.map((k, i) => ({
        label: monthShort(k) + (k.endsWith("-01") || i === 0 ? " " + k.slice(2, 4) : ""),
        value: byMonth.get(k) || 0, now: i === months.length - 1, tip: `${monthLong(k)}: ${plural(byMonth.get(k) || 0)}`,
      }));
      html = columns(data);
      table = data.map((d) => [d.tip.split(":")[0], d.value]);
    } else if (view === "week" && currentKey) {
      const data = [];
      for (let i = 7; i >= 0; i--) {
        const k = addDays(currentKey, -7 * i);
        data.push({ key: k, label: shortDate(k), value: byWeek.get(k) || 0, now: k === currentKey, sel: k === week,
          tip: `${shortDate(k)} – ${shortDate(endKey(k))}: ${plural(byWeek.get(k) || 0)}` });
      }
      html = columns(data, { click: true });
      table = data.map((d) => [d.tip.split(":")[0], d.value]);
    } else if (view === "requester") {
      if (requesters === null) html = '<p class="none">Loading…</p>';
      else if (requesters === "error") html = '<p class="none">Could not load this chart. Please try again.</p>';
      else if (!requesters.length) html = '<p class="none">No requests yet.</p>';
      else {
        const max = Math.max(1, ...requesters.map((r) => r.count));
        html = '<div class="hrows">' + requesters.map((r) => `
          <div class="hrow" title="${esc(r.name)}: ${esc(plural(r.count))}">
            <span class="nm">${esc(r.name)}</span>
            <span><span class="hbar" style="display:block;width:${Math.max(2, Math.round(100 * r.count / max))}%"></span></span>
            <span class="ct">${r.count}</span>
          </div>`).join("") + "</div>";
        table = requesters.map((r) => [r.name, r.count]);
      }
    }
    $("chart").innerHTML = html +
      (table.length ? `<table class="sr-only"><caption>${esc(VIEWS[view].title)}</caption>${table.map((r) => `<tr><th>${esc(r[0])}</th><td>${r[1]}</td></tr>`).join("")}</table>` : "");
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      requesters = data.requesters;
    } catch {
      requesters = "error";
    }
    if (view === "requester") drawDash();
  }

  document.querySelector(".seg").addEventListener("click", (e) => {
    const b = e.target.closest(".segbtn");
    if (!b) return;
    view = b.dataset.view;
    if (view === "requester") { requesters = requesters === "error" ? null : requesters; loadStats(); }
    drawDash();
  });

  $("chart").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-week]");
    if (b) { setNote(""); load(b.dataset.week); }
  });

  const td = (label, html, cls = "") =>
    `<td data-label="${label}" class="${cls}${html === "" ? " blank" : ""}">${html}</td>`;

  function drawTable() {
    const heads = ["Description", "Dimensions", "Material", "QTY", "URL Link", "Image", "Reason for request", "Requester", "Date / Time", ""];
    $("head").innerHTML = "<tr>" + heads.map((h) => `<th>${h}</th>`).join("") + "</tr>";

    $("empty").style.display = items.length ? "none" : "block";
    $("rows").innerHTML = items.map((r) => {
      const link = /^https?:\/\//i.test(r.url)
        ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open link</a>`
        : esc(r.url);
      const img = r.imageId
        ? `<a href="/api/image?id=${esc(r.imageId)}" target="_blank" rel="noopener"><img src="/api/image?id=${esc(r.imageId)}" alt="Attached image" loading="lazy"></a>`
        : "";
      const when = "<span>" + esc(stamp(r.submittedAt)) + (r.editedAt ? '<span class="edited">edited</span>' : "") + "</span>";
      const buttons = `<button type="button" class="btn small" data-act="edit" data-id="${esc(r.id)}">Edit</button><button type="button" class="btn small danger" data-act="delete" data-id="${esc(r.id)}">Delete</button>`;
      return `<tr>
        ${td("Description", esc(r.description), "txt")}
        ${td("Dimensions", esc(r.dimensions), "nw")}
        ${td("Material", esc(r.material), "nw")}
        ${td("QTY", esc(r.qty), "nw")}
        ${td("URL Link", link, "nw")}
        ${td("Image", img, "nw")}
        ${td("Reason", esc(r.reason), "txt")}
        ${td("Requester", esc(r.requester), "nw")}
        ${td("Date / Time", when, "nw")}
        ${td("Actions", buttons, "actions-cell")}
      </tr>`;
    }).join("");
  }

  $("weeks").addEventListener("click", (e) => {
    const mh = e.target.closest(".monthhead");
    if (mh) {
      const m = mh.dataset.month;
      if (openMonths.has(m)) openMonths.delete(m); else openMonths.add(m);
      drawWeeks();
      return;
    }
    const b = e.target.closest(".weekbtn");
    if (b) { setNote(""); load(b.dataset.week); }
  });

  // ---------- Copy list (pastes straight into Excel) ----------
  // Tab between columns, new line between rows: this is what Excel expects when you paste.
  const cell = (v) => {
    let s = String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();
    if (/^[=+\-@]/.test(s)) s = "'" + s;           // stops spreadsheet formulas being run
    if (s.includes('"')) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  function listAsText() {
    const header = ["Description", "Dimensions", "Material", "QTY", "URL Link", "Image", "Reason for request", "Requester", "Date/Time"];
    const rows = items.map((r) => [
      r.description, r.dimensions, r.material, r.qty, r.url,
      r.imageId ? location.origin + "/api/image?id=" + r.imageId : "",
      r.reason, r.requester, excelStamp(r.submittedAt),
    ]);
    return [header, ...rows].map((r) => r.map(cell).join("\t")).join("\r\n");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // older browsers
      const t = document.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
      document.body.appendChild(t);
      t.select();
      t.setSelectionRange(0, text.length);
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      t.remove();
      return ok;
    }
  }

  $("copy").addEventListener("click", async () => {
    const ok = await copyText(listAsText());
    setNote(ok
      ? `Copied ${items.length} request${items.length === 1 ? "" : "s"}. Now click a cell in Excel and paste.`
      : "Could not copy. Please try again.", ok ? "ok" : "err");
  });

  // ---------- Edit and delete (open to everyone) ----------
  $("rows").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const id = b.dataset.id;

    if (b.dataset.act === "delete") {
      if (!confirm("Delete this request? This cannot be undone.")) return;
      b.disabled = true;
      setNote("Deleting…");
      const r = await post({ action: "delete", week, id });
      if (!r.ok) { setNote(r.data.error || "Could not delete.", "err"); b.disabled = false; await load(week); return; }
      setNote("Deleted.", "ok");
      await load(week);
      if (view === "requester") loadStats();
      return;
    }

    const rec = items.find((x) => x.id === id);
    if (rec) openEdit(rec);
  });

  fillRequesters($("e-requester"), "Select name…");
  const E = ["description", "reason", "dimensions", "material", "qty", "url", "requester"];

  function openEdit(rec) {
    editing = rec;
    editImage = "";
    E.forEach((k) => { $("e-" + k).value = rec[k] ?? ""; $("e-" + k).classList.remove("invalid"); });
    $("e-image").value = "";
    $("e-preview").style.display = "none";
    $("e-remove").checked = false;
    $("e-remove-wrap").hidden = !rec.imageId;
    $("e-msg").textContent = "";
    $("editdlg").showModal();
  }

  $("e-image").addEventListener("change", async () => {
    editImage = "";
    $("e-preview").style.display = "none";
    const f = $("e-image").files[0];
    if (!f) return;
    const problem = imageProblem(f);
    if (problem) {
      $("e-msg").textContent = problem;
      $("e-msg").className = "msg err";
      $("e-image").value = "";
      return;
    }
    $("e-msg").textContent = "";
    try {
      editImage = await shrink(f);
      $("e-preview").src = editImage;
      $("e-preview").style.display = "block";
      $("e-remove").checked = false;
    } catch (err) {
      $("e-msg").textContent = err.message;
      $("e-msg").className = "msg err";
    }
  });

  $("e-cancel").addEventListener("click", () => $("editdlg").close());

  $("editform").addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = $("e-msg");
    const fields = {};
    let anyMissing = false;
    E.forEach((k) => {
      fields[k] = $("e-" + k).value.trim();
      const empty = !fields[k];
      $("e-" + k).classList.toggle("invalid", empty);
      if (empty) anyMissing = true;
    });
    if (anyMissing) {
      m.textContent = "Every box must be filled in (type N/A if it does not apply).";
      m.className = "msg err";
      return;
    }
    $("e-save").disabled = true;
    m.textContent = "Saving…";
    m.className = "msg";
    const r = await post({
      action: "edit", week, id: editing.id, fields,
      image: editImage, removeImage: $("e-remove").checked,
    });
    $("e-save").disabled = false;
    if (!r.ok) { m.textContent = r.data.error || "Could not save."; m.className = "msg err"; return; }
    $("editdlg").close();
    setNote("Saved.", "ok");
    await load(week);
    if (view === "requester") loadStats();
  });

  load();
  // Keep the page fresh while it is left open on a screen (not while editing).
  setInterval(() => { if (!$("editdlg").open) load(week); }, 60000);
})();
