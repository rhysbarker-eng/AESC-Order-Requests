// Shared helpers used by both pages.
const REQUESTERS = [
  "Rhys Barker", "Steve Sproat", "John Leeman", "Matt Fishwick", "Neil Edmonds",
  "Rob Gustafson", "Luke Jobling", "James Rhymer", "Keelan Robinson", "Lewis Connelly",
  "Alex Hume", "Liam Marsden", "Steve Kingdon", "Lindon Smith", "Michael Palmer",
  "Dale Perkins", "Paul Teasdale", "Ethan Marrs", "Joe Mitchell", "Steve Guz",
  "Jack Marley", "Billy Connelly",
];

const $ = (id) => document.getElementById(id);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fillRequesters(select, placeholder) {
  select.innerHTML = `<option value="">${esc(placeholder)}</option>` +
    REQUESTERS.map((n) => `<option>${esc(n)}</option>`).join("");
}

// Only these picture types can be uploaded.
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/gif"];
function imageProblem(file) {
  const bad = "That file type can't be used. Please choose a JPG, PNG, WEBP or GIF picture.";
  if (file.type) return IMAGE_TYPES.includes(file.type) ? "" : bad;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name) ? "" : bad;
}

// Shrink photos in the browser so uploads stay small and fast.
function shrink(file, maxSide = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (file.type === "image/gif") {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = url;
  });
}
