<script lang="ts">
	import { resolve } from '$app/paths';
	import { content } from '#lib/stores/content.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import { todayISO } from '#lib/utils/dates.ts';
	import { countStatuses, dueTopics, reviewStreak, reviewsThisWeek } from '#lib/utils/stats.ts';
	import { groupByCategory } from '#lib/utils/filter.ts';
	import { plural } from '#lib/utils/labels.ts';
	import ContentGate from '#lib/components/ContentGate.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import PriorityBadge from '#lib/components/PriorityBadge.svelte';

	const today = todayISO();

	// Everything below is $derived: when you review a topic or content reloads,
	// the dashboard updates itself. No manual refresh logic needed.
	const due = $derived(dueTopics(content.topics, progress.map, today));
	const overall = $derived(countStatuses(content.topics, progress.map));
	const categories = $derived(
		groupByCategory(content.topics).map((g) => ({
			category: g.category,
			counts: countStatuses(g.topics, progress.map)
		}))
	);
	const stats = $derived([
		{ label: 'Topics', value: content.topics.length },
		{ label: 'Due today', value: due.length },
		{ label: 'Reviews this week', value: reviewsThisWeek(progress.map, today) },
		{ label: 'Day streak', value: reviewStreak(progress.map, today) }
	]);
</script>

<svelte:head><title>Dashboard · Knowledge Tracker</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold">Dashboard</h1>

<ContentGate>
	<div class="space-y-8">
		<section aria-labelledby="stats-heading">
			<h2 id="stats-heading" class="sr-only">Quick stats</h2>
			<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each stats as stat (stat.label)}
					<div class="card">
						<dt class="text-xs text-slate-500 dark:text-slate-400">{stat.label}</dt>
						<dd class="text-2xl font-bold tabular-nums">{stat.value}</dd>
					</div>
				{/each}
			</dl>
		</section>

		<section aria-labelledby="due-heading">
			<h2 id="due-heading" class="mb-3 text-lg font-semibold">Due for review</h2>
			{#if due.length === 0}
				<div class="card text-sm text-slate-600 dark:text-slate-400">
					<p>Nothing due today. 🎉</p>
					<p class="mt-1">
						Open any <a
							class="text-indigo-600 underline dark:text-indigo-400"
							href={resolve('/topics')}>topic</a
						>
						and press <strong>Mark reviewed</strong> to start scheduling it.
					</p>
				</div>
			{:else}
				<ul class="space-y-2">
					{#each due as item (item.topic.id)}
						{@const overdue = item.daysOverdue > 0}
						<li>
							<a
								href={resolve('/topics/[id]', { id: item.topic.id })}
								class="flex items-center justify-between gap-3 card hover:border-indigo-300 dark:hover:border-indigo-700 {overdue
									? 'border-l-4 border-l-red-500 dark:border-l-red-500'
									: ''}"
							>
								<span class="min-w-0">
									<span class="block truncate font-medium">{item.topic.title}</span>
									<span class="text-xs text-slate-500 dark:text-slate-400"
										>{item.topic.category}</span
									>
								</span>
								<span class="flex shrink-0 flex-col items-end gap-1">
									<PriorityBadge priority={item.topic.priority} />
									<span
										class="text-xs font-medium {overdue
											? 'text-red-600 dark:text-red-400'
											: 'text-slate-600 dark:text-slate-400'}"
									>
										{overdue ? `Overdue by ${plural(item.daysOverdue, 'day')}` : 'Due today'}
									</span>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section aria-labelledby="progress-heading" class="space-y-5 card">
			<h2 id="progress-heading" class="text-lg font-semibold">Progress</h2>
			<ProgressBar counts={overall} label="Overall" />
			<hr class="border-slate-200 dark:border-slate-800" />
			<ul class="space-y-4">
				{#each categories as { category, counts } (category)}
					<li>
						<a
							href={resolve(`/topics?category=${encodeURIComponent(category)}`)}
							class="-m-2 block rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
						>
							<ProgressBar {counts} label={category} />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</ContentGate>
