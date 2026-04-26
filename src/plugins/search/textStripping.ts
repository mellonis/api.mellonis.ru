const plainTextRules: [RegExp, string][] = [
	[/<<([^>]*?)>>/g, '$1'],
	[/^---\s/mg, '— '],
	[/]---\s/g, ']— '],
	[/([\\(:])(\s)?\s*---\s/g, '$1$2— '],
	[/\s---/g, ' —'],
	[/--/g, '–'],
	[/`/g, '\u0301'],
	[/\[nbsp]/g, ' '],
	[/\[q]/g, '«'],
	[/\[\/q]/g, '»'],
	[/\[img[^\]]*].*?\[\/img]?/igs, ''],
	[/\[[^[]*]/g, ''],
	[/\[\/[^[]*]/g, ''],
];

export const stripBBCode = (text: string): string =>
	plainTextRules.reduce(
		(result, [pattern, replacement]) => result.replace(pattern, replacement),
		text,
	);

export const stripNoteMarkers = (text: string): string =>
	text.replace(/\{!?(.*?)}/g, '$1');

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
