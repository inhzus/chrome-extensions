// Feature 1: personal tags shown next to every username link.
const InnTags = (() => {
  let tags = {};
  let popover = null;

  function usernameFromLink(a) {
    const m = a.getAttribute('href').match(/^(?:https?:\/\/(?:www\.)?v2ex\.com)?\/member\/([^/?#]+)/);
    if (!m) return null;
    const name = decodeURIComponent(m[1]);
    // Only plain-text name links; skip avatar links and things like "/member/x/topics".
    return a.textContent.trim().toLowerCase() === name.toLowerCase() ? name : null;
  }

  function renderInto(span) {
    const name = span.dataset.user;
    const entry = tags[name.toLowerCase()];
    span.replaceChildren();
    (entry ? entry.tags : []).forEach((t) => {
      const pill = document.createElement('span');
      pill.className = 'inn-pill';
      pill.textContent = t;
      pill.style.setProperty('--inn-c', InnStore.tagColor(t));
      pill.title = '编辑标签';
      span.appendChild(pill);
    });
    const btn = document.createElement('span');
    btn.className = 'inn-edit';
    btn.textContent = entry ? '✎' : '+';
    btn.title = entry ? '编辑标签' : '添加标签';
    span.appendChild(btn);
    span.classList.toggle('inn-has', !!entry);
  }

  function makeSpan(name) {
    const span = document.createElement('span');
    span.className = 'inn-tags';
    span.dataset.user = name;
    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openEditor(span);
    });
    renderInto(span);
    return span;
  }

  function decorate(root) {
    root.querySelectorAll('a[href*="/member/"]:not([data-inn])').forEach((a) => {
      a.dataset.inn = '1';
      if (a.closest('#Top, .inn-popover')) return;
      const name = usernameFromLink(a);
      if (!name) return;
      a.after(makeSpan(name));
    });

    // Member profile page: the big username heading.
    const m = location.pathname.match(/^\/member\/([^/]+)\/?$/);
    if (m) {
      const name = decodeURIComponent(m[1]);
      const h1 = [...document.querySelectorAll('#Main h1')].find(
        (h) => !h.dataset.inn && h.textContent.trim().toLowerCase() === name.toLowerCase()
      );
      if (h1) {
        h1.dataset.inn = '1';
        const span = makeSpan(h1.textContent.trim());
        span.classList.add('inn-big');
        h1.after(span);
      }
    }
  }

  function update(newTags) {
    tags = newTags;
    document.querySelectorAll('.inn-tags').forEach(renderInto);
  }

  function closeEditor() {
    if (popover) popover.remove();
    popover = null;
  }

  function openEditor(span) {
    closeEditor();
    const name = span.dataset.user;
    const entry = tags[name.toLowerCase()];

    popover = document.createElement('div');
    popover.className = 'inn-popover';
    if (document.querySelector('.Night')) popover.classList.add('inn-night');
    popover.innerHTML = `
      <div class="inn-pop-title"></div>
      <input type="text" list="inn-tag-list" placeholder="用逗号分隔多个标签" />
      <datalist id="inn-tag-list"></datalist>
      <div class="inn-pop-actions">
        <button class="inn-save">保存</button>
        <button class="inn-cancel">取消</button>
      </div>`;
    popover.querySelector('.inn-pop-title').textContent = `给 ${name} 打标签`;
    const input = popover.querySelector('input');
    input.value = entry ? entry.tags.join(', ') : '';
    const dl = popover.querySelector('datalist');
    InnStore.allTagNames(tags).forEach((t) => {
      const o = document.createElement('option');
      o.value = t;
      dl.appendChild(o);
    });

    const save = async () => {
      const list = input.value.split(/[,，]/);
      closeEditor();
      await InnStore.setUserTags(entry ? entry.name : name, list);
    };
    popover.querySelector('.inn-save').onclick = save;
    popover.querySelector('.inn-cancel').onclick = closeEditor;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) save();
      if (e.key === 'Escape') closeEditor();
    });
    popover.addEventListener('click', (e) => e.stopPropagation());

    document.body.appendChild(popover);
    const r = span.getBoundingClientRect();
    const left = Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - popover.offsetWidth - 8);
    popover.style.left = `${Math.max(8, left)}px`;
    popover.style.top = `${r.bottom + window.scrollY + 4}px`;
    input.focus();
    input.select();
  }

  document.addEventListener('click', closeEditor);

  return { decorate, update };
})();
