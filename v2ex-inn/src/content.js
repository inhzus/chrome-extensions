(async () => {
  let [tags, settings] = await Promise.all([InnStore.getTags(), InnStore.getSettings()]);

  // Hot panel first so its cloned usernames get decorated too.
  InnHot.render(settings);
  InnCheckin.run(settings);
  if (settings.tagsEnabled) {
    InnTags.update(tags);
    InnTags.decorate(document);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.tags) {
      tags = changes.tags.newValue || {};
      if (settings.tagsEnabled) InnTags.update(tags);
    }
    if (changes.settings) location.reload();
  });

  // V2EX loads some content (e.g. reply threads, previews) dynamically.
  if (settings.tagsEnabled) {
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        InnTags.decorate(document);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
