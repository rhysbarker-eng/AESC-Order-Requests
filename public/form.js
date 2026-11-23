(() => {
  const form = $("form");
  const msg = $("msg");
  const btn = $("submit");
  const fileInput = $("image");
  const preview = $("preview");
  let imageData = "";

  const FIELDS = [
    ["description", "Description"],
    ["reason", "Reason for request"],
    ["dimensions", "Dimensions"],
    ["material", "Material"],
    ["qty", "QTY"],
    ["url", "URL Link"],
    ["requester", "Requester"],
  ];

  fillRequesters($("requester"), "Select your name…");

  function setMsg(text, kind) { msg.textContent = text; msg.className = "msg " + (kind || ""); }

  FIELDS.forEach(([id]) => $(id).addEventListener("input", () => $(id).classList.remove("invalid")));

  fileInput.addEventListener("change", async () => {
    imageData = "";
    preview.style.display = "none";
    const f = fileInput.files[0];
    if (!f) return;
    const problem = imageProblem(f);
    if (problem) { setMsg(problem, "err"); fileInput.value = ""; return; }
    setMsg("");
    try {
      imageData = await shrink(f);
      preview.src = imageData;
      preview.style.display = "block";
    } catch (e) {
      setMsg(e.message, "err");
      fileInput.value = "";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const vals = {};
    const missing = [];
    let firstBad = null;
    FIELDS.forEach(([id, name]) => {
      vals[id] = $(id).value.trim();
      const empty = !vals[id];
      $(id).classList.toggle("invalid", empty);
      if (empty) { missing.push(name); firstBad = firstBad || $(id); }
    });
    if (missing.length) {
      setMsg("Please fill in: " + missing.join(", ") + ". Type N/A if something does not apply.", "err");
      firstBad.focus();
      return;
    }
    if (!/^[1-9]\d{0,5}$/.test(vals.qty)) {
      $("qty").classList.add("invalid");
      setMsg("QTY must be a whole number, 1 or more.", "err");
      $("qty").focus();
      return;
    }

    btn.disabled = true;
    setMsg("Submitting…");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...vals, website: $("website").value, image: imageData }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      form.reset();
      imageData = "";
      preview.style.display = "none";
      setMsg("Request submitted – thank you.", "ok");
    } catch (err) {
      setMsg(err.message, "err");
    } finally {
      btn.disabled = false;
    }
  });
})();
