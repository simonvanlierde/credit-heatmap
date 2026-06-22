// Ambient declaration for side-effect CSS imports (e.g. `import "./globals.css"`).
// Next.js 15 does not ship this declaration, and under `moduleResolution: "bundler"`
// TypeScript rejects untyped side-effect imports without it.
declare module "*.css";
