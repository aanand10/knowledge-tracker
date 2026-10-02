// This is a client-only app: all data comes from GitHub/localStorage at runtime.
// `ssr = false` renders everything in the browser. `prerender = true` still emits an
// HTML shell for each static route (/, /topics, /settings) so GitHub Pages can serve them.
export const ssr = false;
export const prerender = true;
