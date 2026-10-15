/* Shared, dependency-free helpers for the extension and its tests. */
(function (root) {
  'use strict';

  const PREFIX = 'ump:v1:';
  const SETTINGS_KEY = PREFIX + 'settings';
  const DEFAULT_SETTINGS = Object.freeze({ autoJump: true, autoSeek: true });
  const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,149}$/;
  const ID_RE = /^\d{1,20}$/;

  function isUdemy(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' &&
        (url.hostname === 'udemy.com' || url.hostname.endsWith('.udemy.com'));
    } catch (_) { return false; }
  }

  function parseRoute(value) {
    try {
      const url = new URL(value);
      if (!isUdemy(value)) return null;
      const match = url.pathname.match(/^\/course\/([^/]+)\/learn(?:\/lecture\/(\d+)(?:\/|$)|\/?$)/i);
      if (!match) return null;
      const slug = decodeURIComponent(match[1]);
      if (!SLUG_RE.test(slug)) return null;
      return { slug, lectureId: match[2] || null, isCourseEntry: !match[2] };
    } catch (_) { return null; }
  }

  function courseKey(slug) { return PREFIX + 'c:' + slug; }
  function lectureKey(slug, lectureId) { return PREFIX + 'l:' + slug + ':' + lectureId; }
  function courseUrl(slug, origin = 'https://www.udemy.com') {
    if (!SLUG_RE.test(slug) || !isUdemy(origin)) return null;
    return new URL(origin).origin + '/course/' + encodeURIComponent(slug) + '/learn/';
  }
  function lectureUrl(slug, lectureId, origin) {
    if (!SLUG_RE.test(slug) || !ID_RE.test(String(lectureId))) return null;
    const base = courseUrl(slug, origin);
    return base ? base + 'lecture/' + lectureId : null;
  }
  function safeSeconds(n) {
    return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(86400 * 10, n)) : 0;
  }
  function formatTime(n) {
    n = Math.floor(safeSeconds(n));
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return h ? [h, m, s].map((x, i) => i ? String(x).padStart(2, '0') : String(x)).join(':')
      : String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function cleanTitle(text, max = 110) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function titleFromPage(documentTitle, slug) {
    const parts = cleanTitle(documentTitle).split(/\s+[|–-]\s+/);
    const title = parts.filter(x => !/^udemy$/i.test(x)).slice(-1)[0] || '';
    return title && title.length > 5 ? title : slug.replace(/-/g, ' ');
  }
  function seekTo(record) {
    if (!record || !Number.isFinite(record.seconds) || record.seconds < 1) return null;
    const duration = safeSeconds(record.duration);
    if (record.completed && duration && record.seconds >= duration - 8) return null;
    return duration ? Math.max(0, Math.min(safeSeconds(record.seconds), duration - 1)) : safeSeconds(record.seconds);
  }
  function validMeta(obj, slug) {
    return !!obj && typeof obj === 'object' && !Array.isArray(obj) &&
      obj.slug === slug && SLUG_RE.test(slug) &&
      (!obj.lastLectureId || ID_RE.test(String(obj.lastLectureId)));
  }
  function validLecture(obj, slug, id) {
    return !!obj && typeof obj === 'object' && !Array.isArray(obj) &&
      obj.slug === slug && String(obj.lectureId) === String(id) &&
      ID_RE.test(String(id)) && Number.isFinite(obj.seconds) && obj.seconds >= 0 &&
      obj.seconds <= 86400 * 10 && Number.isFinite(obj.duration) && obj.duration >= 0 &&
      obj.duration <= 86400 * 10;
  }
  function classifyKey(key) {
    if (typeof key !== 'string') return null;
    const c = key.match(/^ump:v1:c:([a-zA-Z0-9_-]+)$/);
    if (c && SLUG_RE.test(c[1])) return { type: 'course', slug: c[1] };
    const l = key.match(/^ump:v1:l:([a-zA-Z0-9_-]+):(\d+)$/);
    if (l && SLUG_RE.test(l[1]) && ID_RE.test(l[2])) return { type: 'lecture', slug: l[1], lectureId: l[2] };
    return null;
  }
  function cleanRecord(key, record) {
    const parsed = classifyKey(key);
    if (!parsed || !record) return null;
    const updatedAt = Number.isFinite(record.updatedAt) ? Math.max(0, Math.min(Date.now() + 86400000, record.updatedAt)) : 0;
    if (parsed.type === 'course') {
      if (!validMeta(record, parsed.slug)) return null;
      return {
        slug: parsed.slug,
        courseTitle: cleanTitle(record.courseTitle) || parsed.slug.replace(/-/g, ' '),
        origin: isUdemy(record.origin) ? new URL(record.origin).origin : 'https://www.udemy.com',
        lastLectureId: record.lastLectureId ? String(record.lastLectureId) : null,
        updatedAt
      };
    }
    if (!validLecture(record, parsed.slug, parsed.lectureId)) return null;
    return {
      slug: parsed.slug,
      lectureId: parsed.lectureId,
      seconds: safeSeconds(record.seconds),
      duration: safeSeconds(record.duration),
      completed: record.completed === true,
      lectureTitle: cleanTitle(record.lectureTitle),
      updatedAt
    };
  }

  const api = { PREFIX, SETTINGS_KEY, DEFAULT_SETTINGS, isUdemy, parseRoute, courseKey, lectureKey,
    courseUrl, lectureUrl, safeSeconds, formatTime, cleanTitle, titleFromPage, seekTo,
    validMeta, validLecture, classifyKey, cleanRecord };
  root.UdemyMine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
