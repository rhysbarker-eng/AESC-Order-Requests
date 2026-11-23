# AESC Order Request Site – handover notes for Claude

Give this file and the rest of this folder to Claude, then ask for the changes you want.
Suggested first message: "Here is a website I built with another Claude. Read HANDOVER.md and the files, then make these changes: …"

## What it is
A small two-page website, hosted on Netlify, for staff to request orders. Styled from an AESC job page (Outfit font, green #6cc04a, black text, white background). Only the AESC logo (public/logo.png) is kept from the original design.

- Page 1 `/` (public/index.html + form.js): "Order Request" form. Fields: Description, Reason for request, Dimensions, Material, QTY, URL Link, Image (optional), Requester (dropdown of 22 named staff). Every field except Image is required (staff type N/A if not applicable). Validated in the browser and again on the server.
- Page 2 `/submissions.html` (submissions.html + submissions.js): read-only list of requests, current week first, buttons for past weeks. Column order: Description, Dimensions, Material, QTY, URL Link, Image, Reason for request, Requester, Date/Time.
- Edit and Delete: permanent buttons at the end of every request, open to anyone (no password – the owner chose this). Edit opens a pop-up with all fields; Delete asks for confirmation.
- Weeks are grouped under months (a week counts in the month its Monday falls in); each week box shows its request count. The date-range line above the table was removed on purpose.
- Small dashboard beside the week boxes with three views (Month = last 6 months, Week = last 8 weeks and clickable, Requester = all time). Month and week numbers come from `/api/list`; requester numbers come from `/api/stats` (`stats.mjs`). Charts are plain HTML/CSS, no chart library.
- Image box: only JPG, PNG, WEBP and GIF are accepted (checked in the browser and on the server); the form and edit pop-up both show a "Can be used / Cannot be used" note.
- "Copy list" button copies the week on screen as tab-separated text (header row + one row per request) so it pastes into Excel as rows and columns. It replaced an earlier CSV download button.
- Phones: the page is locked to vertical scrolling only (touch-action pan-y, overflow-x hidden).
- Weeks run Monday 09:00 to next Monday 08:59, UK time (Europe/London, handles daylight saving). A fresh list starts each Monday 09:00 automatically.
- Layout: wide on computers (most of a request on one line), big and clear on phones (each request becomes a card; nothing scrolls sideways).

## How it works
- Storage: Netlify Blobs (stores "submissions" keyed `<Monday date>/<id>`, and "images").
- Netlify Functions (netlify/functions): `submit.mjs` (/api/submit), `list.mjs` (/api/list, returns every week with its request count), `stats.mjs` (/api/stats), `image.mjs` (/api/image), `admin.mjs` (/api/admin: edit, delete – no password), `lib.mjs` (requester list, week logic, validation – shared).
- An automatic Monday email and a password lock were both built earlier and then scrapped; neither is in this version.
- Requester names live in two places: `public/common.js` and `netlify/functions/lib.mjs`. Change both.

## Deploying
Use a fresh GitHub repository, and Netlify must collect the files from it (or the Netlify CLI: `npm install` then `npx netlify-cli deploy --prod`). Drag-and-drop does not reliably support the functions. On the Netlify free plan each production deploy uses credits, so batch changes into one upload.

## Testing tip
The functions can be tested locally by replacing `@netlify/blobs` with a small in-memory stub and serving `public/` with a tiny Node server that routes `/api/*` to the functions.
