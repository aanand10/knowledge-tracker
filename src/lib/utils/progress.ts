import { defaultProgress, type ProgressMap, type TopicProgress } from '#lib/types/index.ts';

/** Progress for a topic, or the default if it has never been touched. */
export function progressFor(map: ProgressMap, id: string): TopicProgress {
	return map[id] ?? defaultProgress();
}
