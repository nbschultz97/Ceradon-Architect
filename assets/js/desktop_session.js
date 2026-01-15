(() => {
  const desktopSession = window.desktopSession;
  if (!desktopSession || typeof desktopSession.save !== 'function') {
    return;
  }

  // Add desktop-mode class to body to hide web-only elements
  document.body.classList.add('desktop-mode');

  const state = {
    lastSaved: null,
    pending: null,
    timer: null
  };

  const serialize = (project) => {
    try {
      return JSON.stringify(project, null, 2);
    } catch (error) {
      console.warn('Unable to serialize mission project for desktop save', error);
      return null;
    }
  };

  const flushSave = async () => {
    if (!state.pending) return;
    const payload = state.pending;
    state.pending = null;

    try {
      await desktopSession.save({ data: payload });
      state.lastSaved = payload;
    } catch (error) {
      console.warn('Desktop session save failed', error);
    }
  };

  const scheduleSave = (project) => {
    const json = serialize(project);
    if (!json) return;
    if (json === state.lastSaved) return;

    state.pending = json;
    if (state.timer) {
      clearTimeout(state.timer);
    }
    state.timer = setTimeout(flushSave, 600);
  };

  const patchMissionProjectStore = () => {
    if (!window.MissionProjectStore || typeof MissionProjectStore.saveMissionProject !== 'function') {
      return false;
    }

    const originalSave = MissionProjectStore.saveMissionProject;
    MissionProjectStore.saveMissionProject = (project) => {
      const saved = originalSave(project);
      scheduleSave(saved);
      return saved;
    };

    const originalClear = MissionProjectStore.clearMissionProject;
    MissionProjectStore.clearMissionProject = () => {
      const cleared = originalClear();
      scheduleSave(cleared);
      return cleared;
    };

    const originalImport = MissionProjectStore.importMissionProjectFromText;
    MissionProjectStore.importMissionProjectFromText = (jsonText) => {
      const imported = originalImport(jsonText);
      scheduleSave(imported);
      return imported;
    };

    scheduleSave(MissionProjectStore.loadMissionProject());

    window.addEventListener('beforeunload', () => {
      const project = MissionProjectStore.loadMissionProject();
      const json = serialize(project);
      if (json) {
        desktopSession.save({ data: json });
      }
    });

    return true;
  };

  let attempts = 0;
  const interval = setInterval(() => {
    if (patchMissionProjectStore()) {
      clearInterval(interval);
      return;
    }

    attempts += 1;
    if (attempts > 30) {
      clearInterval(interval);
    }
  }, 200);
})();
