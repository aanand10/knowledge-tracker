/** "Hello, World!" → "hello-world". Used for heading and section ids. */
export function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.trim()
			.replace(/[^\p{L}\p{N}\s-]/gu, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '') || 'section'
	);
}
