/**
 * Where your notes live. This is the ONLY file you need to edit to point the
 * app at your own content repository.
 *
 * The app fetches:
 *   https://raw.githubusercontent.com/<githubUsername>/<repo>/<branch>/topics.json
 *   https://raw.githubusercontent.com/<githubUsername>/<repo>/<branch>/notes/...
 *
 * Leave `githubUsername` or `repo` empty to use the bundled sample content in
 * `static/sample-content/`. The app also falls back to the sample content if the
 * GitHub fetch fails.
 */
export const contentConfig = {
	githubUsername: 'aanand10',
	repo: 'interview-notes',
	branch: 'main'
};

/** Base URL for the GitHub raw content, or null if the config is incomplete. */
export function githubContentBaseUrl(config = contentConfig): string | null {
	const user = config.githubUsername.trim();
	const repo = config.repo.trim();
	const branch = config.branch.trim() || 'main';
	if (!user || !repo) return null;
	return `https://raw.githubusercontent.com/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/`;
}
