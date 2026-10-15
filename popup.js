(() => {
  'use strict';

  const C = globalThis.UdemyMine;
  const I = globalThis.UdemyMineI18n;
  const $ = id => document.getElementById(id);
  const getAll = () => chrome.storage.local.get(null);
  let messageTimeout = null;
  let language = 'en';
  const tr = (key, values) => I.create(language).t(key, values);

  function message(text, error = false) {
    const element = $('message');
    element.textContent = text;
    element.classList.toggle('error', error);
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => { element.textContent = ''; }, 7000);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = tr(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(node => {
      node.setAttribute('aria-label', tr(node.dataset.i18nAria));
    });
    $('language').setAttribute('aria-label', tr('language'));
  }

  function relativeDate(timestamp) {
    if (!timestamp) return '';
    const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
    if (days === 0) return tr('today');
    if (days === 1) return tr('yesterday');
    return tr('daysAgo', {count: days});
  }

  function buildCourseCards(data) {
    const courses = new Map();
    for (const [key, raw] of Object.entries(data)) {
      const parsed = C.classifyKey(key);
      if (!parsed) continue;
      const record = C.cleanRecord(key, raw);
      if (!record) continue;
      if (!courses.has(parsed.slug)) {
        courses.set(parsed.slug, {slug: parsed.slug, meta: null, lectures: []});
      }
      const course = courses.get(parsed.slug);
      if (parsed.type === 'course') course.meta = record;
      else course.lectures.push(record);
    }
    const rows = Array.from(courses.values()).filter(course => course.lectures.length || course.meta);
    rows.sort((a, b) => (b.meta?.updatedAt || 0) - (a.meta?.updatedAt || 0));
    return rows;
  }

  function buildLectureList(course) {
    const list = el('div', 'lecture-list');
    const lectures = [...course.lectures].sort((a, b) => b.updatedAt - a.updatedAt);
    for (const lesson of lectures) {
      const row = el('div', 'lecture-row');
      const anchor = el('a', '', tr('video', {id: lesson.lectureId}) + (lesson.completed ? ' ✓' : ''));
      anchor.href = C.lectureUrl(course.slug, lesson.lectureId, course.meta?.origin);
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      const duration = lesson.duration ? tr('duration', {time: C.formatTime(lesson.duration)}) : '';
      row.append(anchor, el('small', '', `${C.formatTime(lesson.seconds)}${duration}`));
      list.appendChild(row);
    }
    return list;
  }

  function renderCourse(course) {
    const card = el('article', 'course');
    const top = el('div', 'course-top');
    const title = course.meta?.courseTitle || course.slug.replace(/-/g, ' ');
    top.append(
      el('div', 'course-name', title),
      el('div', 'course-date', relativeDate(course.meta?.updatedAt))
    );
    card.appendChild(top);

    const latestId = course.meta?.lastLectureId;
    const mostRecent = course.lectures.find(lesson => lesson.lectureId === latestId) ||
      [...course.lectures].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const info = mostRecent
      ? tr('savedInfo', {
        id: mostRecent.lectureId,
        time: C.formatTime(mostRecent.seconds),
        duration: mostRecent.duration ? tr('duration', {time: C.formatTime(mostRecent.duration)}) : '',
        count: course.lectures.length
      })
      : tr('noVideo');
    card.appendChild(el('p', 'course-info', info));

    const actions = el('div', 'course-actions');
    const resumeUrl = latestId
      ? C.lectureUrl(course.slug, latestId, course.meta?.origin)
      : C.courseUrl(course.slug, course.meta?.origin);
    const resume = el('button', 'btn-go', tr('resume'));
    resume.addEventListener('click', () => { chrome.tabs.create({url: resumeUrl}); });
    const detail = el('button', 'btn-detail', tr('details', {count: course.lectures.length}));
    detail.setAttribute('aria-expanded', 'false');
    detail.addEventListener('click', () => {
      const list = card.querySelector('.lecture-list');
      if (list) {
        list.remove();
        detail.setAttribute('aria-expanded', 'false');
      } else {
        card.appendChild(buildLectureList(course));
        detail.setAttribute('aria-expanded', 'true');
      }
    });
    actions.append(resume, detail);
    card.appendChild(actions);
    return card;
  }

  async function refresh() {
    const data = await getAll();
    const courses = buildCourseCards(data);
    $('course-count').textContent = String(courses.length);
    $('lecture-count').textContent = String(courses.reduce((count, course) => count + course.lectures.length, 0));
    const list = $('courses');
    list.replaceChildren();
    if (!courses.length) {
      const empty = el('div', 'empty');
      empty.append(
        el('div', 'empty-illustration', '▶'),
        el('strong', '', tr('empty.title')),
        el('p', '', tr('empty.text'))
      );
      list.appendChild(empty);
    } else {
      for (const course of courses) list.appendChild(renderCourse(course));
    }
    const settings = {...C.DEFAULT_SETTINGS, ...(data[C.SETTINGS_KEY] || {})};
    $('auto-jump').checked = !!settings.autoJump;
    $('auto-seek').checked = !!settings.autoSeek;
  }

  async function persistSettings() {
    try {
      await chrome.storage.local.set({[C.SETTINGS_KEY]: {
        autoJump: $('auto-jump').checked,
        autoSeek: $('auto-seek').checked
      }});
      message(tr('savedSettings'));
    } catch (err) {
      message(tr('settingsError', {error: err.message}), true);
    }
  }

  async function selectLanguage() {
    const selected = I.validLanguage($('language').value) || 'en';
    $('language').disabled = true;
    try {
      await chrome.storage.local.set({umpLanguage: selected});
      language = selected;
      applyLanguage();
      message('');
      await refresh();
    } catch (err) {
      message(tr('settingsError', {error: err.message}), true);
    } finally {
      // Keep the selector aligned with the persisted language when saving fails.
      $('language').value = language;
      $('language').disabled = false;
    }
  }

  function getRecords(data) {
    const records = Object.create(null);
    for (const [key, value] of Object.entries(data)) {
      if (!C.classifyKey(key)) continue;
      const clean = C.cleanRecord(key, value);
      if (clean) records[key] = clean;
    }
    return records;
  }

  async function exportBackup() {
    try {
      const records = getRecords(await getAll());
      const backup = {
        format: 'udemy-mine-progress',
        version: 1,
        exportedAt: new Date().toISOString(),
        records
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const anchor = el('a');
      anchor.href = url;
      anchor.download = `udemy-mine-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      message(tr('exported', {count: Object.keys(records).length}));
    } catch (err) {
      message(tr('exportError', {error: err.message}), true);
    }
  }

  async function importBackup(file) {
    try {
      if (!file || file.size > 5 * 1024 * 1024) throw new Error(tr('fileSize'));
      const backup = JSON.parse(await file.text());
      if (backup?.format !== 'udemy-mine-progress' || backup.version !== 1 || !backup.records ||
          typeof backup.records !== 'object' || Array.isArray(backup.records)) {
        throw new Error(tr('badBackup'));
      }
      const entries = Object.entries(backup.records);
      if (entries.length > 10000) throw new Error(tr('tooMany'));
      const old = await getAll();
      const patch = Object.create(null);
      let count = 0;
      for (const [key, value] of entries) {
        const clean = C.cleanRecord(key, value);
        if (!clean) continue;
        const existing = C.cleanRecord(key, old[key]);
        // Preserve newer local learning progress when importing an older backup.
        if (!existing || clean.updatedAt > existing.updatedAt) {
          patch[key] = clean;
          count++;
        }
      }
      if (count) await chrome.storage.local.set(patch);
      await refresh();
      message(tr('imported', {count}));
    } catch (err) {
      message(tr('importError', {error: err.message}), true);
    } finally {
      $('import-file').value = '';
    }
  }

  async function deleteProgress() {
    if (!confirm(tr('confirmClear'))) return;
    try {
      const keys = Object.keys(await getAll()).filter(key => C.classifyKey(key));
      if (keys.length) await chrome.storage.local.remove(keys);
      await refresh();
      message(tr('deleted', {count: keys.length}));
    } catch (err) {
      message(tr('deleteError', {error: err.message}), true);
    }
  }

  $('language').addEventListener('change', () => { void selectLanguage(); });
  $('auto-jump').addEventListener('change', persistSettings);
  $('auto-seek').addEventListener('change', persistSettings);
  $('export').addEventListener('click', exportBackup);
  $('import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', event => {
    if (event.target.files?.[0]) void importBackup(event.target.files[0]);
  });
  $('clear').addEventListener('click', deleteProgress);

  (async () => {
    try {
      const data = await getAll();
      language = I.validLanguage(data.umpLanguage) || I.initialLanguage(navigator.language);
      $('language').value = language;
      applyLanguage();
      await refresh();
    } catch (err) {
      applyLanguage();
      message(tr('readError', {error: err.message}), true);
    }
  })();
})();
