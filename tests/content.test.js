const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const core = fs.readFileSync(path.join(__dirname, '../core.js'), 'utf8');
const i18n = fs.readFileSync(path.join(__dirname, '../i18n.js'), 'utf8');
const content = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
class FakeVideo {
  constructor() {
    this.readyState = 4;
    this.duration = 1800;
    this.currentTime = 0;
    this.paused = true;
    this.ended = false;
    this.clientWidth = 900;
    this.clientHeight = 600;
    this.videoWidth = 900;
    this.isConnected = true;
    this.src = 'https://videos.example/lecture1';
    this.handlers = new Map();
  }
  addEventListener(name, fn) { this.handlers.set(name, fn); }
  removeEventListener(name) { this.handlers.delete(name); }
}

function mount({slug='docker', lectureId='123', progress=755, lastId=lectureId, referrer='https://www.udemy.com/home'}) {
  const store = Object.create(null);
  store[`ump:v1:c:${slug}`] = {slug, courseTitle:'Docker Mastery',lastLectureId:lastId,updatedAt:Date.now() - 5000};
  store[`ump:v1:l:${slug}:${lectureId}`] = {slug,lectureId,seconds:progress,duration:1800,completed:false,updatedAt:Date.now() - 5000};
  const intervals = new Map();
  const video = new FakeVideo();
  const location = {
    href:`https://www.udemy.com/course/${slug}/learn/lecture/${lectureId}`,
    replace(url) { this.redirect = url; },
    assign(url) { this.redirect = url; }
  };
  const window = {location,top:null,addEventListener() {}};
  window.top=window;
  const documentHandlers = new Map();
  function fakeNode() {
    const node = {
      children: [], handlers: new Map(), attributes: {}, className: '', textContent: '',
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); return child; },
      remove() { this.removed = true; },
      addEventListener(name, fn) { this.handlers.set(name, fn); },
      setAttribute(name, value) { this.attributes[name] = value; },
      querySelector(selector) {
        const cls = selector.slice(1);
        for (const child of this.children) {
          if (child.className === cls) return child;
          const found = child.querySelector(selector);
          if (found) return found;
        }
        return null;
      }
    };
    return node;
  }
  const body = fakeNode();
  const document = {
    title:'Docker Mastery | Udemy',referrer,hidden:false,
    addEventListener(name, fn) { documentHandlers.set(name, fn); },
    querySelectorAll(selector) {return selector==='video'?[video]:[];},
    createElement(){return fakeNode();}, body
  };
  const session = new Map();
  let storageChanged;
  const context = {
    window, document, location, navigator: {language:'en-US'}, sessionStorage: {
      getItem(k) {return session.has(k)?session.get(k):null;},
      setItem(k, v) {session.set(k,v);}
    },
    chrome: {storage:{local:{
      async get(keys) {
        const picked = {};
        for (const key of Array.isArray(keys)?keys:[keys]) if (Object.hasOwn(store,key)) picked[key]=store[key];
        return picked;
      },
      async set(patch) {Object.assign(store,patch);}
    }, onChanged: {addListener(fn) {storageChanged = fn;}}}},
    HTMLVideoElement: FakeVideo,
    URL, console, Date, Number, Math,
    setInterval(fn,delay) {intervals.set(delay,fn);},
    clearInterval() {}, setTimeout, clearTimeout
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(core,context);
  vm.runInContext(i18n,context);
  vm.runInContext(content,context);
  return {store,intervals,video,location,body, get storageChanged() { return storageChanged; }};
}
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
(async() => {
  const johnny = mount({progress:755});
  const other = mount({progress:120});
  await delay(3300);
  assert.ok(Math.abs(johnny.video.currentTime - 755) < 1, 'Johnny restores 12:35');
  assert.ok(Math.abs(other.video.currentTime - 120) < 1, 'Other computer restores 2:00');
  johnny.video.currentTime=800;
  johnny.video.paused=false;
  johnny.intervals.get(5000)();
  await delay(15);
  assert.equal(johnny.store['ump:v1:l:docker:123'].seconds,800);
  assert.equal(other.store['ump:v1:l:docker:123'].seconds,120);

  const autoJump = mount({lectureId:'444',lastId:'999',referrer:'https://www.udemy.com/home'});
  await delay(20);
  assert.equal(autoJump.location.redirect, 'https://www.udemy.com/course/docker/learn/lecture/999');

  const directDeepLink = mount({lectureId:'444',lastId:'999',referrer:'https://external.example.com/'});
  await delay(20);
  assert.equal(directDeepLink.location.redirect, undefined);

  const prompt = directDeepLink.body.children.find(node => node.id === 'ump-resume-prompt');
  assert.ok(prompt, 'external deep link shows a resume prompt');
  assert.equal(prompt.querySelector('.ump-title').textContent, 'Your private progress is saved');
  assert.equal(prompt.querySelector('.ump-dismiss').textContent, 'Later');
  directDeepLink.storageChanged({umpLanguage:{newValue:'vi'}}, 'local');
  assert.equal(prompt.querySelector('.ump-title').textContent, 'Tiến độ riêng của bạn đã được lưu');
  assert.equal(prompt.querySelector('.ump-desc').textContent, 'Bài 999, tại 00:00. Tiếp tục từ vị trí của máy này?');
  assert.equal(prompt.querySelector('.ump-go').textContent, 'Tiếp tục bài của tôi');
  assert.equal(prompt.querySelector('.ump-dismiss').textContent, 'Để sau');
  console.log('PASS: tracking restore/save, safe auto-resume, and live resume-prompt translation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
