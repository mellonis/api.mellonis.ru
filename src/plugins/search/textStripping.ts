// Quote pairs by [q] nesting depth, mirroring the site renderers' plain-text
// mode: L1 «», L2 „“, L3+ ‚‘.
const QUOTE_PAIRS = [['«', '»'], ['„', '“'], ['‚', '‘']] as const;

const replaceQTags = (text: string): string => {
	let depth = 0;
	return text.replace(/\[(\/?)q]/g, (_match, closing) => {
		if (closing) {
			depth = Math.max(0, depth - 1);
			return QUOTE_PAIRS[Math.min(depth, QUOTE_PAIRS.length - 1)][1];
		}
		const open = QUOTE_PAIRS[Math.min(depth, QUOTE_PAIRS.length - 1)][0];
		depth += 1;
		return open;
	});
};

const plainTextRules: [RegExp, string][] = [
	[/<<([^>]*?)>>/g, '$1'],
	[/\[img[^\]]*].*?\[\/img]?/igs, ''],
	[/\[[^[]*]/g, ''],
	[/\[\/[^[]*]/g, ''],
];

export const stripBBCode = (text: string): string =>
	plainTextRules.reduce(
		(result, [pattern, replacement]) => result.replace(pattern, replacement),
		replaceQTags(text),
	);

export const stripNoteMarkers = (text: string): string =>
	text.replace(/\{!?.*?}/g, '').replace(/ {2,}/g, ' ');

export const extractInlineNotes = (text: string): string[] => {
	const notes: string[] = [];
	text.replace(/\{!?(.*?)}/g, (_, content: string) => {
		if (content) notes.push(content);
		return '';
	});
	return notes;
};

export const prepareText = (text: string): string =>
	stripBBCode(stripNoteMarkers(text));

export const prepareNotes = (notes: { text: string }[]): string =>
	notes.map((n) => stripBBCode(n.text)).join('\n');

export const extractAudioTitles = (infoJson: string | null): string[] => {
	if (!infoJson) return [];

	try {
		const info = JSON.parse(infoJson) as { attachments?: { audio?: { title?: string }[] } };
		return (info.attachments?.audio ?? [])
			.map((a) => a.title)
			.filter((t): t is string => t != null);
	} catch {
		return [];
	}
};
