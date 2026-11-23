# AESC Order Request Site

Two pages on Netlify:

- `/` – order request form. Every box must be filled in (type N/A if it does not apply). Only the image is optional.
- `/submissions.html` – the list of requests. The current week shows first. Weeks are grouped under months (click a month to open or close it), and each week box shows how many requests it holds.
  - A small **dashboard** shows the number of requests by month, by week or by requester. Use the Month / Week / Requester buttons to switch. In the Week view, tap a bar to open that week.
  - **Copy list** copies the week on screen. Click a cell in Excel and paste (Ctrl+V / Cmd+V) and it fills in rows and columns.
  - **Edit** and **Delete** buttons at the end of every request. There is no password: anyone can use them.

The image box accepts JPG, PNG, WEBP and GIF only (one image per request).

Weeks run **Monday 09:00 to the next Monday 08:59 (UK time)**. A fresh list starts automatically each Monday at 09:00.

## Updating the site
Upload the changed files to the GitHub repository (Add file > Upload files > Commit changes). Netlify publishes it automatically.
Each publish uses Netlify credits, so batch changes into one upload.

## Changing things
- Requester names: edit `public/common.js` **and** `netlify/functions/lib.mjs`.
- Logo: replace `public/logo.png`.
- Colours / font: top of `public/style.css`.
