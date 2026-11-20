// Shared storage helpers. Used by content scripts, popup and options page.
// tags:     { [lowercased username]: { name: "DisplayName", tags: ["tag", ...] } }
// settings: { hotEnabled, hotTop, hotMin, hotCollapse (px), tagsEnabled, checkinEnabled }
// checkin:  { date: "YYYY-MM-DD" (Beijing) of last success, pending?, failedAt? }
const InnStore = (() => {
  const DEFAULT_SETTINGS = { hotEnabled: true, hotTop: 5, hotMin: 3, hotCollapse: 240, tagsEnabled: true, checkinEnabled: true };

  async function getTags() {
    const { tags } = await chrome.storage.local.get('tags');
    return tags || {};
  }

  async function setUserTags(name, list) {
    const tags = await getTags();
    const key = name.toLowerCase();
    const clean = [...new Set(list.map((t) => t.trim()).filter(Boolean))];
    if (clean.length) tags[key] = { name, tags: clean };
    else delete tags[key];
    await chrome.storage.local.set({ tags });
  }

  async function replaceTags(tags) {
    await chrome.storage.local.set({ tags });
  }

  async function getSettings() {
    const { settings } = await chrome.storage.local.get('settings');
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  }

  async function setSettings(patch) {
    const settings = { ...(await getSettings()), ...patch };
    await chrome.storage.local.set({ settings });
  }

  async function getCheckin() {
    const { checkin } = await chrome.storage.local.get('checkin');
    return checkin || {};
  }

  async function setCheckin(checkin) {
    await chrome.storage.local.set({ checkin });
  }

  function allTagNames(tags) {
    const set = new Set();
    Object.values(tags).forEach((u) => u.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }

  // Stable color per tag text.
  function tagColor(text) {
    let h = 0;
    for (const ch of text) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return `hsl(${h % 360} 65% 45%)`;
  }

  return { DEFAULT_SETTINGS, getTags, setUserTags, replaceTags, getSettings, setSettings, getCheckin, setCheckin, allTagNames, tagColor };
})();
