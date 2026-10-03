<script lang="ts">
	import { cloud } from '#lib/stores/cloud.svelte.ts';
	import { greeting } from '#lib/utils/greeting.ts';
	import { resolve } from '$app/paths';
	import { content } from '#lib/stores/content.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import { todayISO } from '#lib/utils/dates.ts';
	import { countStatuses, dueTopics, reviewStreak, reviewsThisWeek } from '#lib/utils/stats.ts';
	import { groupByCategory } from '#lib/utils/filter.ts';
	import ContentGate from '#lib/components/ContentGate.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import PriorityBadge from '#lib/components/PriorityBadge.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import TopicTitle from '#lib/components/TopicTitle.svelte';

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
		{ label: 'topics', value: content.topics.length },
		{ label: 'due', value: due.length },
		{ label: 'reviews (7d)', value: reviewsThisWeek(progress.map, today) },
		{ label: 'streak', value: `${reviewStreak(progress.map, today)}d` }
	]);
</script>

<svelte:head><title>Dashboard · Knowledge Tracker</title></svelte:head>

<header class="mb-4">
	{#if cloud.firstName}
		<p class="text-sm text-muted">{greeting()}, <span class="text-fg">{cloud.firstName}</span>.</p>
	{/if}
	<h1 class="font-sans text-xl font-semibold">
		{cloud.firstName ? `${cloud.firstName}'s dashboard` : 'Dashboard'}
	</h1>
</header>

<ContentGate>
	<div class="space-y-6">
		<section aria-labelledby="stats-heading">
			<h2 id="stats-heading" class="sr-only">Quick stats</h2>
			<!-- gap-px over a line-coloured background draws 1px dividers between cells. -->
			<dl class="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
				{#each stats as stat (stat.label)}
					<div class="bg-bg px-3 py-2">
						<dt class="text-xs text-muted">{stat.label}</dt>
						<dd class="text-lg font-semibold tabular-nums">{stat.value}</dd>
					</div>
				{/each}
			</dl>
		</section>

		<section aria-labelledby="due-heading" class="box">
			<h2 id="due-heading" class="box-head">
				due for review <span class="text-fg">({due.length})</span>
			</h2>
			{#if due.length === 0}
				<p class="px-3 py-3 text-xs text-muted">
					nothing due today. Open a <a class="link" href={resolve('/')}>topic</a> and hit "Mark reviewed"
					to start scheduling it.
				</p>
			{:else}
				<ul class="divide-y divide-line">
					{#each due as item (item.topic.id)}
						{@const overdue = item.daysOverdue > 0}
						<li>
							<a
								href={resolve('/topics/[id]', { id: item.topic.id })}
								class="flex items-baseline gap-3 px-3 py-2 hover:bg-panel"
							>
								<span class="w-20 shrink-0 text-xs {overdue ? 'text-danger' : 'text-warn'}">
									{overdue ? `-${item.daysOverdue}d` : 'today'}
								</span>
								<span class="min-w-0 flex-1 truncate font-sans font-medium text-link">
									<TopicTitle title={item.topic.title} />
								</span>
								<span class="hidden text-xs text-muted sm:inline">{item.topic.category}</span>
								<PriorityBadge priority={item.topic.priority} />
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section aria-labelledby="progress-heading" class="box">
			<h2 id="progress-heading" class="flex justify-between gap-2 box-head">
				<span>progress</span>
				<span aria-hidden="true"
					><span class="text-ok">confident</span>/<span class="text-warn">learning</span
					>/total</span
				>
			</h2>
			<div class="space-y-2 px-3 py-3">
				<ProgressBar counts={overall} label="all" />
				<div class="flex flex-wrap gap-x-3 pb-1 text-xs text-muted">
					<StatusBadge status="confident" />
					{overall.confident}
					<StatusBadge status="learning" />
					{overall.learning}
					<StatusBadge status="not-started" />
					{overall['not-started']}
				</div>
				<ul class="space-y-0.5 border-t border-line pt-2">
					{#each categories as { category, counts } (category)}
						<li>
							<a
								href={resolve(`/?category=${encodeURIComponent(category)}`)}
								class="-mx-1.5 block px-1.5 py-1 hover:bg-panel"
							>
								<ProgressBar {counts} label={category} />
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	</div>
</ContentGate>
