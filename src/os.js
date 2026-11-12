// The desktop that lives inside the monitor. Plain DOM, no dependencies.

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return e;
}

const put = (el, ...kids) => el.append(...kids.flat(Infinity).filter(Boolean));

const link = (l, cls = '') =>
  h('a', { class: cls, href: l.url, ...(l.url.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener' }) }, l.label);

export function mountOS(root, content) {
  let scale = 1, z = 10;
  const windows = new Map();

  // ───────── apps ─────────
  const apps = {
    projects: {
      title: 'Projects', icon: '📁',
      render(body) {
        const list = () => {
          body.replaceChildren(
            h('div', { class: 'grid' }, content.projects.map((p) =>
              h('button', { class: 'proj', onclick: () => detail(p) },
                thumb(p),
                p.org && h('small', { class: 'eyebrow' }, p.org),
                h('strong', {}, p.title),
                h('span', {}, p.blurb),
                h('div', { class: 'tags' }, p.tags.map((t) => h('i', {}, t)))))));
        };
        const detail = (p) => {
          body.replaceChildren(
            h('button', { class: 'crumb', onclick: list }, '← All projects'),
            h('div', { class: 'detail' },
              thumb(p, 'hero'),
              h('div', {},
                p.org && h('small', { class: 'eyebrow' }, p.org),
                h('h2', {}, p.title),
                h('div', { class: 'tags' }, p.tags.map((t) => h('i', {}, t))),
                p.description.map((d) => h('p', {}, d)),
                p.highlights?.length ? h('ul', {}, p.highlights.map((x) => h('li', {}, x))) : null,
                p.note && h('p', { class: 'note' }, p.note),
                h('div', { class: 'actions' }, (p.links || []).map((l) => link(l, 'btn'))))));
          body.scrollTop = 0;
        };
        list();
      },
    },
    about: {
      title: 'About', icon: '👤',
      render(body) {
        put(body,
          h('h2', { class: 'serif' }, content.about.headline),
          content.about.paragraphs.map((p) => h('p', {}, p)),
          content.about.stats && h('div', { class: 'stats' }, content.about.stats.map((s) => h('div', {}, h('b', {}, s.n), h('span', {}, s.label)))),
          h('h3', {}, 'Skills'),
          h('div', { class: 'skills' }, Object.entries(content.about.skills).map(([group, items]) =>
            h('div', {}, h('b', {}, group), h('div', { class: 'tags' }, items.map((t) => h('i', {}, t)))))));
      },
    },
    experience: {
      title: 'Experience', icon: '💼',
      render(body) {
        put(body,
          h('div', { class: 'timeline' }, content.experience.map((x) =>
            h('article', {},
              h('small', {}, x.when),
              h('strong', {}, x.role), h('span', {}, x.org),
              h('ul', {}, x.points.map((p) => h('li', {}, p)))))),
          h('h3', {}, 'Education'),
          content.education.map((e) => h('p', {}, h('b', {}, e.what), ' — ' + [e.where, e.when].filter(Boolean).join(', '))));
      },
    },
    contact: {
      title: 'Contact', icon: '✉️',
      render(body) {
        put(body,
          h('h2', { class: 'serif' }, 'Let’s talk.'),
          h('p', {}, 'The fastest way to reach me is email. I usually reply within a day.'),
          h('div', { class: 'contact' }, content.links.map((l) => link(l, 'btn big'))));
      },
    },
  };

  function thumb(p, cls = '') {
    const t = h('div', { class: 'thumb ' + cls });
    if (p.image) t.style.backgroundImage = `url("${p.image}")`;
    else {
      t.style.backgroundImage = `linear-gradient(135deg, ${p.colors?.[0] || '#667'}, ${p.colors?.[1] || '#334'})`;
      t.textContent = p.title.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    }
    return t;
  }

  // ───────── chrome ─────────
  const clock = h('span', { class: 'os-clock' });
  const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  tick(); setInterval(tick, 20000);

  const layer = h('div', { class: 'os-windows' });
  const launcher = (cls) => h('nav', { class: cls }, Object.entries(apps).map(([id, a]) =>
    h('button', { 'data-app': id, onclick: () => open(id) }, h('span', { class: 'ico' }, a.icon), h('span', {}, a.title))));

  root.append(
    h('div', { class: 'os-bar' }, h('b', {}, '◆  ' + content.name), h('span', { class: 'grow' }), clock),
    h('div', { class: 'os-desk' },
      h('div', { class: 'os-wall' }, h('div', { class: 'serif' }, content.name), h('p', {}, 'Pick an app to get started')),
      launcher('os-icons'),
      layer),
    launcher('os-tabs'));

  // ───────── windows ─────────
  function focus(win) {
    win.style.zIndex = ++z;
    root.querySelectorAll('[data-app]').forEach((b) => b.classList.toggle('on', b.dataset.app === win.dataset.id));
  }
  function open(id) {
    const app = apps[id];
    if (!app) return;
    let win = windows.get(id);
    if (win) { focus(win); return; }
    const body = h('div', { class: 'win-body' });
    const bar = h('div', { class: 'win-bar' },
      h('button', { class: 'dot', 'aria-label': 'Close ' + app.title, onclick: (e) => { e.stopPropagation(); close(id); } }),
      h('span', {}, app.title));
    win = h('section', { class: 'win', 'data-id': id, onpointerdown: () => focus(win) }, bar, body);
    const n = windows.size;
    win.style.left = 150 + n * 26 + 'px';
    win.style.top = 14 + n * 22 + 'px';
    drag(bar, win);
    app.render(body);
    layer.append(win);
    windows.set(id, win);
    focus(win);
  }
  function close(id) {
    windows.get(id)?.remove();
    windows.delete(id);
    root.querySelectorAll(`[data-app="${id}"]`).forEach((b) => b.classList.remove('on'));
  }
  function drag(handle, win) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || root.classList.contains('mobile')) return;
      const x0 = e.clientX, y0 = e.clientY, l0 = win.offsetLeft, t0 = win.offsetTop;
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => {
        win.style.left = Math.max(-400, l0 + (ev.clientX - x0) / scale) + 'px';
        win.style.top = Math.max(0, t0 + (ev.clientY - y0) / scale) + 'px';
      };
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  return { open, close, setScale: (s) => { scale = s; } };
}
