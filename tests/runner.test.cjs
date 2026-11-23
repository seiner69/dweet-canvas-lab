const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');

// Run the shipped page and its controls without a CDN, browser or downloaded code.
function loadPage() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '', checked: false, style: {},
      width: 1920, height: 1080, replaceChildren() {}, addEventListener() {},
      getContext: () => ({setTransform() {}, clearRect() {}}),
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: {getElementById: getElement}, window: {},
    performance: {now: () => 0}, requestAnimationFrame() {}, escape, unescape,
  });
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) new vm.Script(match[1]).runInContext(context, {timeout: 1000});
  }
  return {context, getElement, run: code => vm.runInContext(code, context, {timeout: 1000})};
}

test('resuming after invalid code never executes the previous sketch, and corrected code recovers', () => {
  const page = loadPage();
  const code = page.getElement('code');
  code.value = 'globalThis.previousDraws = (globalThis.previousDraws || 0) + 1';
  page.run('frame(1000)');
  assert.equal(page.context.previousDraws, 1);

  code.value = 'const =';
  page.run('frame(2000)');
  assert.match(page.getElement('error').textContent, /SyntaxError/);
  assert.equal(page.getElement('pause').textContent, '继续');
  for (let i = 0; i < 2; i++) {
    page.getElement('pause').onclick();
    page.run('frame(3000)');
    assert.equal(page.context.previousDraws, 1, 'invalid editor must not replay cached code');
    assert.equal(page.getElement('pause').textContent, '继续');
  }

  code.value = 'globalThis.correctedDraws = (globalThis.correctedDraws || 0) + 1';
  page.getElement('run').onclick();
  page.run('frame(4000)');
  assert.equal(page.context.previousDraws, 1);
  assert.equal(page.context.correctedDraws, 1);
  assert.equal(page.getElement('error').textContent, '');
});

test('running an empty editor replaces the previous sketch with empty code', () => {
  const page = loadPage();
  page.getElement('code').value = 'globalThis.draws = (globalThis.draws || 0) + 1';
  page.run('frame(1000)');
  assert.equal(page.context.draws, 1);
  page.getElement('code').value = '   \n';
  page.getElement('run').onclick();
  page.run('frame(2000)');
  page.run('frame(3000)');
  assert.equal(page.context.draws, 1, 'cleared editor must not replay cached code');
  assert.equal(page.getElement('error').textContent, '');
});
