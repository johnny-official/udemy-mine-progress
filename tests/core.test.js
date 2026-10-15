const assert = require('node:assert/strict');
const C = require('../core.js');

const link = 'https://www.udemy.com/course/docker-mastery/learn/lecture/12345678?start=0#overview';
assert.deepEqual(C.parseRoute(link), {slug: 'docker-mastery', lectureId: '12345678', isCourseEntry: false});
assert.deepEqual(C.parseRoute('https://udemy.com/course/k8s/learn/'), {slug: 'k8s', lectureId: null, isCourseEntry: true});
assert.equal(C.parseRoute('https://evil.tld/course/docker/learn/lecture/123'), null);
assert.equal(C.parseRoute('http://www.udemy.com/course/docker/learn/lecture/123'), null);
assert.equal(C.parseRoute('https://www.udemy.com/course/docker/learn/lecture/abc'), null);
assert.equal(C.parseRoute('https://www.udemy.com/course/docker/'), null);
assert.equal(C.lectureUrl('docker-mastery', '12345678'), 'https://www.udemy.com/course/docker-mastery/learn/lecture/12345678');
assert.equal(C.lectureUrl('bad/slash', '12345678'), null);
assert.equal(C.lectureUrl('k8s', '<script>'), null);
assert.notEqual(C.lectureKey('k8s', '1'), C.lectureKey('k8s', '2'));
assert.notEqual(C.lectureKey('k8s', '1'), C.lectureKey('docker', '1'));
assert.equal(C.formatTime(755), '12:35');
assert.equal(C.formatTime(3670), '1:01:10');
assert.equal(C.seekTo({seconds: 755, duration: 1800}), 755);
assert.equal(C.seekTo({seconds: 1799, duration: 1800, completed: true}), null);
assert.equal(C.seekTo({seconds: 1000, duration: 900}), 899);
assert.equal(C.seekTo({seconds: 0, duration: 900}), null);
const lecture = {slug: 'docker', lectureId: '123', seconds: 20, duration: 180, completed: false, updatedAt: Date.now()};
const meta = {slug: 'docker', courseTitle: 'Docker', lastLectureId: '123', updatedAt: Date.now()};
assert.deepEqual(C.cleanRecord(C.lectureKey('docker', '123'), lecture).lectureId, '123');
assert.equal(C.cleanRecord(C.lectureKey('docker', '124'), lecture), null);
assert.equal(C.cleanRecord(C.courseKey('docker'), meta).lastLectureId, '123');
assert.equal(C.cleanRecord('malicious', lecture), null);
assert.equal(C.cleanRecord(C.lectureKey('docker', '123'), {...lecture, seconds: -5}), null);
assert.equal(C.classifyKey('ump:v1:l:docker:__proto__'), null);
for (const host of ['udemy.com', 'www.udemy.com', 'company.udemy.com', 'team.company.udemy.com']) {
  const origin = 'https://' + host;
  assert.equal(C.isUdemy(origin), true);
  assert.equal(C.parseRoute(origin + '/course/docker/learn/lecture/123').lectureId, '123');
  assert.equal(C.lectureUrl('docker', '123', origin), origin + '/course/docker/learn/lecture/123');
  assert.equal(C.cleanRecord(C.courseKey('docker'), {...meta, origin}).origin, origin);
}
for (const origin of ['https://notudemy.com', 'https://udemy.com.evil.tld', 'http://company.udemy.com', 'https://udemy.com@evil.tld', 'invalid']) {
  assert.equal(C.isUdemy(origin), false);
  assert.equal(C.parseRoute(origin + '/course/docker/learn/lecture/123'), null);
  assert.equal(C.lectureUrl('docker', '123', origin), null);
  assert.equal(C.cleanRecord(C.courseKey('docker'), {...meta, origin}).origin, 'https://www.udemy.com');
}
assert.equal(C.cleanRecord(C.courseKey('docker'), meta).origin, 'https://www.udemy.com');
assert.deepEqual(require('../manifest.json').content_scripts[0].matches, ['https://*.udemy.com/*']);
console.log('PASS: routes, subdomains, resume origins, local isolation, timestamps, backup validation.');
