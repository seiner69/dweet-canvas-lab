const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');

// Exercise the shipped page logic with a minimal DOM; no user code, CDN or GIF runs.
function loadPage() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '', checked: false, style: {},
      getContext: () => ({}), addEventListener() {},
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: {getElementById: getElement},
    performance: {now: () => 0}, requestAnimationFrame() {}, escape, unescape,
  });
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) new vm.Script(match[1]).runInContext(context, {timeout: 1000});
  }
  return {context, getElement, run: code => vm.runInContext(code, context, {timeout: 1000})};
}

test('ASCII source round-trips, including odd lengths and multiline code', () => {
  const page = loadPage();
  for (const source of ['', 'a', 'ab', 'x.fillRect(0,0,100,100)', 'c.width=1920;\n\tx.fillRect(1,2,3,4)', '/*` ${value} \\*/']) {
    page.context.input = source;
    assert.equal(page.run('decodePackedCode(wrapPackedUtf16(packUtf16Source(input)))'), source);
  }
});

test('unsupported Unicode and control characters fail before packing', () => {
  const page = loadPage();
  for (const source of ["x.fillText('中文',0,0)", '// 😀', '// café', '\0a', '\x7f', '\ud800']) {
    page.context.input = source;
    assert.throws(() => page.run('packUtf16Source(input)'), /ASCII/);
  }
});

test('invalid input clears stale output, preserves source and allows recovery', () => {
  const page = loadPage();
  const code = page.getElement('code');
  code.value = 'x.fillRect(0,0,1,1)';
  page.run('packCurrentCode()');
  assert.ok(page.getElement('utf16Output').value.startsWith('eval('));
  code.value = "x.fillText('中文',0,0)";
  assert.doesNotThrow(() => page.run('packCurrentCode()'));
  assert.equal(page.getElement('utf16Output').value, '');
  assert.match(page.getElement('utf16Decoded').textContent, /ASCII/);
  assert.equal(code.value, "x.fillText('中文',0,0)");
  assert.match(page.getElement('utf16Stat').innerHTML, /未生成/);
  code.value = 'x.fillRect(2,3,4,5)';
  page.run('packCurrentCode()');
  assert.equal(page.getElement('utf16Decoded').textContent, code.value);
  assert.match(page.getElement('utf16Stat').innerHTML, /反解一致/);
});

test('decoder treats pasted source as data and does not execute it', () => {
  const page = loadPage();
  page.context.input = 'globalThis.executed = true';
  const result = page.run('decodePackedCode(wrapPackedUtf16(packUtf16Source(input)))');
  assert.equal(result, page.context.input);
  assert.equal(page.context.executed, undefined);
});

test('all supported character pairs survive the generated wrapper', () => {
  const page = loadPage();
  assert.equal(page.run(`(() => {
    const characters = [9, 10, 13, ...Array.from({length: 95}, (_, i) => i + 32)];
    for (const a of characters) for (const b of characters) {
      const source = 'x' + String.fromCharCode(a, b) + 'z';
      if (decodePackedCode(wrapPackedUtf16(packUtf16Source(source))) !== source) return false;
    }
    return true;
  })()`), true);
});

test('failed round-trip validation never leaves copyable output', () => {
  const page = loadPage();
  page.getElement('code').value = 'x.fillRect(1,2,3,4)';
  page.run('packCurrentCode()');
  page.run('decodePackedCode = () => "corrupted"; packCurrentCode()');
  assert.equal(page.getElement('utf16Output').value, '');
  assert.match(page.getElement('utf16Decoded').textContent, /校验失败/);
});
