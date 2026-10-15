/* Runs only on Udemy. Progress belongs to this extension installation, not the Udemy account. */
(() => {
  'use strict';

  if (window.top !== window || !globalThis.UdemyMine) return;
  const C = globalThis.UdemyMine;
  const I = globalThis.UdemyMineI18n;
  const SESSION_COURSE = 'ump:v1:tabCourse';
  const SESSION_MANUAL = 'ump:v1:manualLink';
  const SAVE_INTERVAL_MS = 5000;
  const POLL_INTERVAL_MS = 700;
  const isUdemy = C.isUdemy;
  let language = 'en';
  const tr = (key, values) => I.create(language).t(key, values);

  const state = {
    route: null,
    routeKey: null,
    epoch: 0,
    active: false,
    video: null,
    listeners: [],
    ready: false,
    saved: null,
    settings: {...C.DEFAULT_SETTINGS},
    restoreTimer: null,
    restoreStartedAt: 0,
    restoreTarget: null,
    restoreTries: 0,
    blockedByUser: false,
    previousMedia: null,
    waitForSwitchUntil: 0,
    mediaLoadCounts: new WeakMap(),
    lastStoredPosition: -1,
    lastSaveAt: 0,
    prompt: null,
    promptData: null
  };
  const pendingWrites = [];
  let writing = false;

  function readSession(key) {
    try { return sessionStorage.getItem(key); }
    catch (_) { return null; }
  }

  function writeSession(key, value) {
    try { sessionStorage.setItem(key, value); }
    catch (_) { /* Session storage is best-effort. */ }
  }

  function canonicalRouteKey(route) {
    return route ? `${route.slug}:${route.lectureId || ''}` : '';
  }

  function normalizeMediaSource(video) {
    return video ? String(video.currentSrc || video.src || '') : '';
  }

  async function drainWrites() {
    if (writing) return;
    writing = true;
    while (pendingWrites.length) {
      const next = pendingWrites.shift();
      try {
        await chrome.storage.local.set(next);
      } catch (error) {
        console.warn('[Udemy Mine] Could not save progress:', error);
      }
    }
    writing = false;
  }

  function storeSnapshot(route, video, markComplete = false) {
    if (!route || !route.lectureId || !video || !state.ready) return;
    const seconds = C.safeSeconds(video.currentTime);
    const duration = C.safeSeconds(video.duration);
    if (!Number.isFinite(video.currentTime) || (duration === 0 && seconds === 0)) return;

    const old = state.saved;
    // Do not let a player's transient reset to zero erase a valid checkpoint.
    if (seconds < 2 && old && old.seconds > 15 && !state.blockedByUser) return;

    const now = Date.now();
    const completed = markComplete || video.ended || !!(old && old.completed) ||
      !!(duration > 0 && seconds / duration >= 0.995);
    const lecture = {
      slug: route.slug,
      lectureId: route.lectureId,
      seconds,
      duration,
      completed,
      lectureTitle: '',
      updatedAt: now
    };
    const meta = {
      slug: route.slug,
      courseTitle: C.titleFromPage(document.title, route.slug),
      lastLectureId: route.lectureId,
      origin: new URL(location.href).origin,
      updatedAt: now
    };
    pendingWrites.push({
      [C.lectureKey(route.slug, route.lectureId)]: lecture,
      [C.courseKey(route.slug)]: meta
    });
    state.saved = lecture;
    state.lastStoredPosition = seconds;
    state.lastSaveAt = now;
    void drainWrites();
  }

  function snapshotNow(complete = false) {
    if (!state.active || !state.ready || !state.video) return;
    storeSnapshot(state.route, state.video, complete);
  }

  function clearRestoreTimer() {
    if (state.restoreTimer !== null) clearTimeout(state.restoreTimer);
    state.restoreTimer = null;
  }

  function finishRestoration() {
    clearRestoreTimer();
    state.ready = true;
    state.restoreTarget = null;
    state.lastStoredPosition = state.saved ? state.saved.seconds : -1;
  }

  function stopVideoTracking() {
    clearRestoreTimer();
    if (state.video) {
      for (const [event, handler] of state.listeners) state.video.removeEventListener(event, handler);
    }
    state.listeners = [];
    state.video = null;
    state.ready = false;
    state.blockedByUser = false;
    state.restoreTarget = null;
  }

  function restoreTick(epoch, video) {
    clearRestoreTimer();
    if (epoch !== state.epoch || state.video !== video || !state.active) return;
    if (state.blockedByUser) {
      finishRestoration();
      return;
    }
    if (video.readyState < 1 || !Number.isFinite(video.duration)) {
      if (Date.now() - state.restoreStartedAt > 9000) {
        finishRestoration();
        return;
      }
      state.restoreTimer = setTimeout(() => restoreTick(epoch, video), 350);
      return;
    }

    const target = Math.min(state.restoreTarget, Math.max(0, video.duration - 1));
    if (!Number.isFinite(target) || target < 1) {
      finishRestoration();
      return;
    }
    const elapsed = (Date.now() - state.restoreStartedAt) / 1000;
    const expected = target + (!video.paused ? elapsed : 0);
    if (Math.abs(video.currentTime - expected) > 3 && state.restoreTries < 5) {
      try {
        video.currentTime = target;
        state.restoreTries++;
      } catch (error) {
        console.warn('[Udemy Mine] Player rejected seek:', error);
      }
    }
    // Udemy can apply shared-account progress after metadata; wait briefly, then stop seeking.
    if (elapsed >= 2.8) {
      finishRestoration();
      return;
    }
    state.restoreTimer = setTimeout(() => restoreTick(epoch, video), 450);
  }

  function activateVideo(video) {
    if (video === state.video) return;
    stopVideoTracking();
    state.video = video;
    state.blockedByUser = false;
    state.lastStoredPosition = -1;
    const epoch = state.epoch;
    const listen = (type, handler) => {
      video.addEventListener(type, handler);
      state.listeners.push([type, handler]);
    };
    listen('loadedmetadata', () => {
      if (!state.ready && state.restoreTarget !== null) restoreTick(epoch, video);
      else if (state.ready) snapshotNow();
    });
    listen('play', () => { if (state.ready) snapshotNow(); });
    listen('pause', () => { if (state.ready) snapshotNow(); });
    listen('seeked', () => { if (state.ready) snapshotNow(); });
    listen('ended', () => { if (state.ready) snapshotNow(true); });

    state.restoreTarget = state.settings.autoSeek ? C.seekTo(state.saved) : null;
    if (state.restoreTarget !== null) {
      state.ready = false;
      state.restoreStartedAt = Date.now();
      state.restoreTries = 0;
      restoreTick(epoch, video);
    } else {
      state.ready = true;
      // Count a newly opened video only after its player exists.
      if (video.readyState >= 1) snapshotNow();
    }
  }

  function findVideo() {
    const candidates = Array.from(document.querySelectorAll('video'));
    if (!candidates.length) return null;
    candidates.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight));
    return candidates.find(video => video.isConnected && (video.clientWidth > 180 || video.videoWidth > 180)) || candidates[0];
  }

  function refreshPlayer() {
    if (!state.active || !state.route || !state.route.lectureId) return;
    const video = findVideo();
    if (!video || video === state.video) return;
    const previous = state.previousMedia;
    if (previous && video === previous.element && normalizeMediaSource(video) === previous.src &&
        (state.mediaLoadCounts.get(video) || 0) === previous.loadEpoch && Date.now() < state.waitForSwitchUntil) return;
    state.previousMedia = null;
    activateVideo(video);
  }

  function updatePrompt() {
    if (!state.prompt) return;
    const {lectureId, seconds} = state.promptData;
    state.prompt.querySelector('.ump-title').textContent = tr('resumeTitle');
    state.prompt.querySelector('.ump-desc').textContent = tr('resumeDesc', {
      id: lectureId,
      time: C.formatTime(seconds)
    });
    state.prompt.querySelector('.ump-go').textContent = tr('resumeMine');
    state.prompt.querySelector('.ump-dismiss').textContent = tr('later');
  }

  function dismissPrompt() {
    if (state.prompt) state.prompt.remove();
    state.prompt = null;
    state.promptData = null;
  }

  function showResumePrompt(slug, lectureId, seconds) {
    dismissPrompt();
    const url = C.lectureUrl(slug, lectureId, location.href);
    if (!url) return;
    const box = document.createElement('div');
    box.id = 'ump-resume-prompt';
    for (const className of ['ump-title', 'ump-desc', 'ump-actions']) {
      const node = document.createElement('div');
      node.className = className;
      box.appendChild(node);
    }
    const actions = box.querySelector('.ump-actions');
    const go = document.createElement('button');
    const close = document.createElement('button');
    go.className = 'ump-go';
    close.className = 'ump-dismiss';
    go.addEventListener('click', () => {
      dismissPrompt();
      location.assign(url);
    });
    close.addEventListener('click', dismissPrompt);
    actions.append(go, close);
    (document.body || document.documentElement).appendChild(box);
    state.prompt = box;
    state.promptData = {slug, lectureId, seconds, url};
    updatePrompt();
  }

  function clickedSpecificLesson(route) {
    const manual = readSession(SESSION_MANUAL);
    if (!manual) return false;
    try {
      const info = JSON.parse(manual);
      if (Date.now() - info.when > 30000) return false;
      return info.slug === route.slug && info.lectureId === route.lectureId;
    } catch (_) {
      return false;
    }
  }

  async function handleNewRoute(route) {
    // Prevent an earlier asynchronous storage read from overriding a newer SPA route.
    const epoch = state.epoch;
    const sessionCourse = readSession(SESSION_COURSE);
    const firstEntry = sessionCourse !== route.slug;
    try {
      const keys = [C.courseKey(route.slug), C.SETTINGS_KEY, 'umpLanguage'];
      if (route.lectureId) keys.push(C.lectureKey(route.slug, route.lectureId));
      const data = await chrome.storage.local.get(keys);
      if (epoch !== state.epoch) return;
      if (firstEntry) writeSession(SESSION_COURSE, route.slug);
      const meta = C.cleanRecord(C.courseKey(route.slug), data[C.courseKey(route.slug)]);
      state.settings = {...C.DEFAULT_SETTINGS, ...(data[C.SETTINGS_KEY] || {})};
      language = I.validLanguage(data.umpLanguage) || I.initialLanguage(navigator.language);
      const saved = route.lectureId
        ? C.cleanRecord(C.lectureKey(route.slug, route.lectureId), data[C.lectureKey(route.slug, route.lectureId)])
        : null;
      state.saved = saved;
      const ownLast = meta && meta.lastLectureId && meta.lastLectureId !== route.lectureId
        ? C.lectureUrl(route.slug, meta.lastLectureId, location.href)
        : null;
      const explicitlyClicked = clickedSpecificLesson(route);
      const fromUdemy = isUdemy(document.referrer);
      const refRoute = C.parseRoute(document.referrer);
      const fromOtherLecture = refRoute && refRoute.slug === route.slug && !!refRoute.lectureId;
      // Auto-jump only on a fresh course entry, never after explicit lesson selection.
      const safeAutoJump = firstEntry && state.settings.autoJump && !explicitlyClicked &&
        (route.isCourseEntry || (fromUdemy && !fromOtherLecture));
      if (ownLast && safeAutoJump) {
        location.replace(ownLast);
        return;
      }
      // Respect external deep links; offer the local checkpoint as a one-click prompt instead.
      if (ownLast && firstEntry) {
        const last = data[C.lectureKey(route.slug, meta.lastLectureId)] ||
          (await chrome.storage.local.get(C.lectureKey(route.slug, meta.lastLectureId)))[C.lectureKey(route.slug, meta.lastLectureId)];
        if (epoch !== state.epoch) return;
        showResumePrompt(route.slug, meta.lastLectureId, last?.seconds || 0);
      }
      if (route.lectureId) {
        state.active = true;
        refreshPlayer();
      }
    } catch (error) {
      console.warn('[Udemy Mine] Could not load data:', error);
      // Do not overwrite an unknown checkpoint if storage could not be read.
    }
  }

  function checkRoute() {
    const route = C.parseRoute(location.href);
    const key = canonicalRouteKey(route);
    if (key === state.routeKey) {
      refreshPlayer();
      return;
    }
    if (state.active && state.video && state.ready) snapshotNow();
    const previous = state.video;
    const previousMedia = previous ? {
      element: previous,
      src: normalizeMediaSource(previous),
      loadEpoch: state.mediaLoadCounts.get(previous) || 0
    } : null;
    state.epoch++;
    dismissPrompt();
    stopVideoTracking();
    state.route = route;
    state.routeKey = key;
    state.active = false;
    state.saved = null;
    state.previousMedia = route && route.lectureId ? previousMedia : null;
    state.waitForSwitchUntil = Date.now() + 9000;
    if (!route) {
      writeSession(SESSION_COURSE, '');
      return;
    }
    void handleNewRoute(route);
  }

  // Capture explicit lecture selection before Udemy changes the SPA address.
  document.addEventListener('click', event => {
    const anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    const route = C.parseRoute(anchor.href);
    if (route && route.lectureId) {
      writeSession(SESSION_MANUAL, JSON.stringify({slug: route.slug, lectureId: route.lectureId, when: Date.now()}));
    }
  }, true);
  document.addEventListener('loadstart', event => {
    if (event.target instanceof HTMLVideoElement) {
      const count = state.mediaLoadCounts.get(event.target) || 0;
      state.mediaLoadCounts.set(event.target, count + 1);
      refreshPlayer();
    }
  }, true);
  document.addEventListener('pointerdown', event => {
    if (state.ready || !state.video || state.restoreTarget === null) return;
    const target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('[data-purpose*="progress"], [data-purpose*="seek"], [role="slider"], .vjs-progress-control')) {
      state.blockedByUser = true;
      finishRestoration();
    }
  }, true);
  document.addEventListener('keydown', () => {
    if (!state.ready && state.video && state.restoreTarget !== null) {
      state.blockedByUser = true;
      finishRestoration();
    }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) snapshotNow(); });
  window.addEventListener('pagehide', () => snapshotNow());
  window.addEventListener('popstate', checkRoute);
  window.addEventListener('hashchange', checkRoute);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[C.SETTINGS_KEY]) {
      state.settings = {...C.DEFAULT_SETTINGS, ...(changes[C.SETTINGS_KEY].newValue || {})};
    }
    if (changes.umpLanguage) {
      language = I.validLanguage(changes.umpLanguage.newValue) || I.initialLanguage(navigator.language);
      // Update prompt text only; language changes never touch video tracking state.
      updatePrompt();
    }
  });

  setInterval(checkRoute, POLL_INTERVAL_MS);
  setInterval(() => {
    if (state.ready && state.active && state.video && !state.video.paused) snapshotNow();
  }, SAVE_INTERVAL_MS);
  checkRoute();
})();
