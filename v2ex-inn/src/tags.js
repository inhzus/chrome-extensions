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
    // Inline edit button only on the member page heading; elsewhere the hover chip does it.
    if (span.classList.contains('inn-big')) {
      const btn = document.createElement('span');
      btn.className = 'inn-edit';
      btn.textContent = entry ? '✎' : '+';
      btn.title = entry ? '编辑标签' : '添加标签';
      span.appendChild(btn);
    }
    span.classList.toggle('inn-has', !!entry);
  }

  function makeSpan(name, big = false) {
    const span = document.createElement('span');
    span.className = big ? 'inn-tags inn-big' : 'inn-tags';
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
        h1.after(makeSpan(h1.textContent.trim(), true));
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

  // A single floating chip above the hovered username, so nothing inline covers or shifts page text.
  let chip = null;
  let chipSpan = null;
  let showTimer = 0;
  let hideTimer = 0;

  function hideChip() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (chip) chip.hidden = true;
    chipSpan = null;
  }

  function showChip(span) {
    if (!chip) {
      chip = document.createElement('span');
      chip.className = 'inn-chip';
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const span = chipSpan;
        hideChip();
        if (span) openEditor(span);
      });
      document.body.appendChild(chip);
    }
    const has = !!tags[span.dataset.user.toLowerCase()];
    chip.textContent = has ? '✎ 标签' : '+ 标签';
    chip.title = has ? '编辑标签' : '添加标签';
    chip.classList.toggle('inn-night', !!document.querySelector('.Night'));
    chip.hidden = false;
    chipSpan = span;

    const name = span.previousElementSibling || span;
    const r = name.getBoundingClientRect();
    const maxLeft = window.scrollX + document.documentElement.clientWidth - chip.offsetWidth - 4;
    chip.style.left = `${Math.min(r.right + window.scrollX - 6, maxLeft)}px`;
    chip.style.top = `${Math.max(window.scrollY, r.top + window.scrollY - chip.offsetHeight + 2)}px`;
  }

  // Hovered tag span, via its username link or its pills (not the member page heading).
  function spanAt(el) {
    const span = el.closest('.inn-tags') || el.closest('a[data-inn]')?.nextElementSibling;
    return span?.matches('.inn-tags:not(.inn-big)') ? span : null;
  }

  document.addEventListener('mouseover', (e) => {
    if (!(e.target instanceof Element)) return;
    if (chip && chip.contains(e.target)) {
      clearTimeout(hideTimer);
      return;
    }
    const span = spanAt(e.target);
    if (span) {
      clearTimeout(hideTimer);
      if (span === chipSpan && !chip.hidden) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(() => showChip(span), 150);
    } else {
      clearTimeout(showTimer);
      if (chipSpan) hideTimer = setTimeout(hideChip, 200);
    }
  });
  window.addEventListener('scroll', hideChip, { capture: true, passive: true });

  function openEditor(span) {
    closeEditor();
    hideChip();
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
