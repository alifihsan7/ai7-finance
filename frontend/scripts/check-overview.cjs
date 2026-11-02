const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadComponent(filename) {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const componentModule = new Module(filename, module);
  componentModule.filename = filename;
  componentModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = componentModule.require.bind(componentModule);
  componentModule.require = (name) => name.startsWith(".")
    ? loadComponent(path.resolve(path.dirname(filename), name + ".tsx"))
    : nativeRequire(name);
  componentModule._compile(compiled, filename);
  return componentModule.exports;
}

const { LumaOverview } = loadComponent(path.resolve(__dirname, "../src/components/LumaOverview.tsx"));
const fixture = {
  totalBalance: 24850000, income: 8500000, expense: 3650000, accountCount: 3,
  safeDaily: 55000, pocketAccount: "Belanja", pocketRemaining: 2350000, pocketBudget: 6000000,
  dayOfCycle: 10, cycleDays: 30, daysRemaining: 20, paceStatus: "on_track", periodEnded: false,
  formatRupiah: (value) => "Rp" + new Intl.NumberFormat("id-ID").format(value),
  onAddTransaction() {}, onOpenPaycheck() {}, onSignIn() {}, onRetry() {},
};
const render = (props) => renderToStaticMarkup(React.createElement(LumaOverview, { ...fixture, ...props }));
const text = (markup) => markup.replace(/<[^>]*>/g, " ");

assert.doesNotMatch(text(render({ isGuest: true })), /Rp|Pace aman|rekening Anda/);
assert.match(text(render({ isGuest: true })), /Data keuangan belum ditampilkan/);
console.log("PASS: guest does not expose fixture amounts or assert an account balance.");

const failure = render({ error: "Koneksi terputus." });
assert.match(failure, /role="alert"/);
assert.match(text(failure), /Coba lagi/);
assert.doesNotMatch(text(failure), /24\.850\.000/);
console.log("PASS: failure replaces stale financial amounts with an announced retry state.");

const unset = text(render({ pocketBudget: null }));
assert.match(unset, /Anggaran belum diatur/);
assert.doesNotMatch(unset, /Belanja dalam batas anggaran|55\.000/);
console.log("PASS: unset budget never presents a spending allowance or safety status.");

const ended = text(render({ periodEnded: true }));
assert.match(ended, /Periode berakhir/);
assert.doesNotMatch(ended, /55\.000|Belanja dalam batas anggaran/);
console.log("PASS: ended cycle cannot present a current daily allowance.");

assert.match(render({ pocketRemaining: -5000 }), /aria-valuenow="0"/);
assert.match(render({ pocketRemaining: 9000000 }), /aria-valuenow="100"/);
console.log("PASS: budget progress remains within accessible bounds for debt and overflow.");

const zero = text(render({ totalBalance: 0, income: 0, expense: 0, safeDaily: 0 }));
assert.match(zero, /Rp0/);
assert.doesNotMatch(zero, /24\.850\.000|55\.000/);
assert.match(render({ loading: true }), /aria-busy="true"/);
console.log("PASS: real zero values stay zero; loading is announced without fixture amounts.");
