// Feature 2: pin the most-hearted replies on this page right below the topic.
const InnHot = (() => {
  function parseReply(cell) {
    const heartImg = cell.querySelector('span.small.fade img[src*="heart"], span.small.fade img[alt^="❤"]');
    const hearts = heartImg ? parseInt(heartImg.parentElement.textContent.replace(/\D/g, ''), 10) || 0 : 0;
    const floor = parseInt(cell.querySelector('span.no')?.textContent, 10) || 0;
    return { cell, hearts, floor };
  }

  function topicBox() {
    const header = document.querySelector('#Main .box > .header');
    return header ? header.parentElement : null;
  }

  function jumpTo(cell) {
    cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cell.classList.remove('inn-flash');
    void cell.offsetWidth; // restart animation
    cell.classList.add('inn-flash');
  }

  function buildItem({ cell, hearts, floor }, collapseAt) {
    const item = document.createElement('div');
    item.className = 'cell inn-hot-item';

    const head = document.createElement('div');
    head.className = 'inn-hot-head';
    const avatar = cell.querySelector('img.avatar');
    if (avatar) {
      const img = avatar.cloneNode();
      img.width = 24;
      img.removeAttribute('height');
      head.appendChild(img);
    }
    const userLink = cell.querySelector('strong > a[href^="/member/"]');
    if (userLink) {
      const strong = document.createElement('strong');
      const a = document.createElement('a');
      a.href = userLink.getAttribute('href');
      a.className = 'dark';
      a.textContent = userLink.textContent;
      strong.appendChild(a);
      head.appendChild(strong);
    }
    const heart = document.createElement('span');
    heart.className = 'inn-hot-hearts';
    heart.textContent = `❤ ${hearts}`;
    head.appendChild(heart);
    const jump = document.createElement('a');
    jump.className = 'inn-hot-floor';
    jump.href = `#${cell.id}`;
    jump.textContent = `#${floor}`;
    jump.title = '跳到原楼层';
    jump.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', `#${cell.id}`);
      jumpTo(cell);
    });
    head.appendChild(jump);
    item.appendChild(head);

    const content = cell.querySelector('.reply_content');
    if (content) {
      const body = content.cloneNode(true);
      body.classList.add('inn-hot-body');
      item.appendChild(body);
      body.style.setProperty('--inn-collapse', `${collapseAt}px`);
      requestAnimationFrame(() => {
        // A little slack so a reply just over the limit isn't folded for one line.
        if (body.scrollHeight > collapseAt + 20) {
          body.classList.add('inn-collapsed');
          const more = document.createElement('a');
          more.href = 'javascript:';
          more.className = 'inn-hot-more';
          more.textContent = '展开';
          more.addEventListener('click', () => {
            const collapsed = body.classList.toggle('inn-collapsed');
            more.textContent = collapsed ? '展开' : '收起';
          });
          item.appendChild(more);
        }
      });
    }
    return item;
  }

  function render(settings) {
    document.querySelector('.inn-hot')?.remove();
    if (!settings.hotEnabled || !/^\/t\/\d+/.test(location.pathname)) return;
    const box = topicBox();
    if (!box) return;

    const hot = [...document.querySelectorAll('div.cell[id^="r_"]')]
      .map(parseReply)
      .filter((r) => r.hearts >= settings.hotMin)
      .sort((a, b) => b.hearts - a.hearts || a.floor - b.floor)
      .slice(0, settings.hotTop);
    if (!hot.length) return;

    const panel = document.createElement('div');
    panel.className = 'box inn-hot';
    const title = document.createElement('div');
    title.className = 'cell inn-hot-title';
    title.textContent = `🔥 热门回复（本页 Top ${hot.length}）`;
    panel.appendChild(title);
    hot.forEach((r) => panel.appendChild(buildItem(r, settings.hotCollapse)));

    const sep = document.createElement('div');
    sep.className = 'sep20 inn-hot-sep';
    box.after(sep, panel);
  }

  return { render };
})();
