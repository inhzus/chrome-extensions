const ids = ['tagsEnabled', 'hotEnabled', 'hotTop', 'hotMin', 'checkinEnabled'];

InnStore.getSettings().then((s) => {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el.type === 'checkbox') el.checked = s[id];
    else el.value = s[id];
  }
});

document.getElementById('save').onclick = async () => {
  const patch = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    patch[id] = el.type === 'checkbox' ? el.checked : Math.max(1, parseInt(el.value, 10) || InnStore.DEFAULT_SETTINGS[id]);
  }
  await InnStore.setSettings(patch);
  const saved = document.getElementById('saved');
  saved.hidden = false;
  setTimeout(() => (saved.hidden = true), 1500);
};
