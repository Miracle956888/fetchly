// Some existing Netlify projects select `client` as their monorepo package
// directory. Netlify discovers the Server relative to that directory, while
// projects using the repository root discover netlify/server/index.mjs instead.
// Both entrypoints use the same backend and build configuration.
export { default } from '../../../netlify/server/index.mjs';
