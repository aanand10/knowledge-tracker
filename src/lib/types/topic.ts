export const PRIORITIES = ['high', 'medium', 'low'] as const;
/** `(typeof PRIORITIES)[number]` turns the array above into the union 'high' | 'medium' | 'low'. */
export type Priority = (typeof PRIORITIES)[number];

export interface Resource {
	label: string;
	url: string;
}

/** One entry in topics.json (after validation and defaults have been applied). */
export interface Topic {
	id: string;
	title: string;
	category: string;
	priority: Priority;
	tags: string[];
	/** Path to the Markdown note, relative to the content root, e.g. "notes/javascript/closures.md". */
	note: string | null;
	resources: Resource[];
}
