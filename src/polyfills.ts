// Polyfills para pdf-parse en entornos Node (Electron Main Process)
if (typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix { constructor() {} };
}
if (typeof (global as any).Path2D === 'undefined') {
  (global as any).Path2D = class Path2D { constructor() {} };
}
