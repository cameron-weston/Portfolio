# 3D room portfolio

A static site: no build step, no dependencies to install. Three.js loads from a CDN.

## Edit
- `src/content.js` — all text: name, links, projects, experience, hotspot cards. Replace everything marked `PLACEHOLDER`.
- `resume.pdf` — drop it next to `index.html`.
- Project screenshots — put them in `images/` and set `image: 'images/name.png'` on a project.
- `src/main.js` — the room (objects, lights, camera). `src/os.js` + `styles.css` — the desktop inside the monitor.

## Run locally
```bash
python3 -m http.server 4173
```
Then open http://localhost:4173 (opening `index.html` directly will not work; ES modules need a server).

## Deploy
Any static host works. Easiest: drag this folder onto https://app.netlify.com/drop, or push it to GitHub and enable Pages, or run `npx vercel`.
