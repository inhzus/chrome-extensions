const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const emptyEl = document.getElementById('empty');
let tags = {};

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const rows = Object.entries(tags)
    .filter(([key, u]) => !q || key.includes(q) || u.tags.some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => a[0].localeCompare(b[0]));
  listEl.replaceChildren();
  emptyEl.hidden = Object.keys(tags).length > 0;
  for (const [, u] of rows) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'user';
    a.href = `https://www.v2ex.com/member/${encodeURIComponent(u.name)}`;
    a.target = '_blank';
    a.textContent = u.name;
    const pills = document.createElement('span');
    pills.className = 'pills';
    u.tags.forEach((t) => {
      const p = document.createElement('span');
      p.className = 'pill';
      p.textContent = t;
      p.style.background = InnStore.tagColor(t);
      pills.appendChild(p);
    });
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.title = '删除该用户的所有标签';
    del.onclick = () => InnStore.setUserTags(u.name, []);
    li.append(a, pills, del);
    listEl.appendChild(li);
  }
}

async function load() {
  tags = await InnStore.getTags();
  render();
}

searchEl.addEventListener('input', render);
chrome.storage.onChanged.addListener((c, area) => area === 'local' && c.tags && load());

document.getElementById('open-options').onclick = (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
};

document.getElementById('export').onclick = () => {
  const blob = new Blob([JSON.stringify({ version: 1, tags }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `v2ex-inn-tags-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

const fileEl = document.getElementById('file');
document.getElementById('import').onclick = () => fileEl.click();
fileEl.onchange = async () => {
  const file = fileEl.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const incoming = data.tags || data;
    const merged = { ...tags };
    for (const [key, u] of Object.entries(incoming)) {
      if (!u || !Array.isArray(u.tags)) continue;
      const k = key.toLowerCase();
      const prev = merged[k]?.tags || [];
      merged[k] = { name: u.name || key, tags: [...new Set([...prev, ...u.tags.map(String)])] };
    }
    await InnStore.replaceTags(merged);
    alert(`已导入 ${Object.keys(incoming).length} 个用户的标签`);
  } catch (err) {
    alert(`导入失败：${err.message}`);
  }
  fileEl.value = '';
};

load();
