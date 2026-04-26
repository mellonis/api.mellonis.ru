import { describe, expect, test } from 'vitest';
import { stripBBCode, stripNoteMarkers, prepareText, prepareNotes, extractAudioTitles } from './textStripping.js';

describe('stripBBCode', () => {
	test('strips bold and italic tags', () => {
		expect(stripBBCode('[b]bold[/b] and [i]italic[/i]')).toBe('bold and italic');
	});

	test('strips quote tags to guillemets', () => {
		expect(stripBBCode('[q]quote[/q]')).toBe('\u00ABquote\u00BB');
	});

	test('strips nested tags', () => {
		expect(stripBBCode('[b][i]text[/i][/b]')).toBe('text');
	});

	test('strips center, right, part tags', () => {
		expect(stripBBCode('[c]center[/c] [r]right[/r] [part]part[/part]')).toBe('center right part');
	});

	test('replaces [nbsp] with space', () => {
		expect(stripBBCode('word[nbsp]word')).toBe('word word');
	});

	test('converts em-dashes', () => {
		expect(stripBBCode('word --- word')).toBe('word \u2014 word');
		expect(stripBBCode('word--word')).toBe('word\u2013word');
	});

	test('converts backticks to combining acute accent', () => {
		expect(stripBBCode('o`')).toBe('o\u0301');
	});

	test('strips image tags', () => {
		expect(stripBBCode('[img alt]/path/to/img[/img]')).toBe('');
	});

	test('strips br tags', () => {
		expect(stripBBCode('line[br]line[br/]end')).toBe('linelineend');
	});

	test('returns empty string for empty input', () => {
		expect(stripBBCode('')).toBe('');
	});

	test('returns plain text unchanged', () => {
		expect(stripBBCode('plain text')).toBe('plain text');
	});
});

describe('stripNoteMarkers', () => {
	test('strips inline note markers', () => {
		expect(stripNoteMarkers('text{note}rest')).toBe('textnoterest');
	});

	test('strips out-of-text note markers', () => {
		expect(stripNoteMarkers('text{!note}rest')).toBe('textnoterest');
	});

	test('strips multiple markers', () => {
		expect(stripNoteMarkers('{first} text{!second}')).toBe('first textsecond');
	});

	test('leaves text without markers unchanged', () => {
		expect(stripNoteMarkers('plain text')).toBe('plain text');
	});
});

describe('prepareText', () => {
	test('strips both BBCode and note markers', () => {
		expect(prepareText('[b]bold[/b]{!note}')).toBe('boldnote');
	});
});

describe('prepareNotes', () => {
	test('strips BBCode from notes and joins with newline', () => {
		const notes = [
			{ text: '[i]italic[/i] note' },
			{ text: 'plain note' },
		];
		expect(prepareNotes(notes)).toBe('italic note\nplain note');
	});

	test('returns empty string for empty array', () => {
		expect(prepareNotes([])).toBe('');
	});
});

describe('extractAudioTitles', () => {
	test('extracts audio titles from valid JSON', () => {
		const info = JSON.stringify({
			attachments: {
				audio: [
					{ title: 'Track 1', sources: [{ src: '/a.mp3', type: 'audio/mpeg' }] },
					{ title: 'Track 2', sources: [{ src: '/b.mp3', type: 'audio/mpeg' }] },
				],
			},
		});
		expect(extractAudioTitles(info)).toEqual(['Track 1', 'Track 2']);
	});

	test('skips audio items without title', () => {
		const info = JSON.stringify({
			attachments: {
				audio: [
					{ sources: [{ src: '/a.mp3', type: 'audio/mpeg' }] },
					{ title: 'With title', sources: [{ src: '/b.mp3', type: 'audio/mpeg' }] },
				],
			},
		});
		expect(extractAudioTitles(info)).toEqual(['With title']);
	});

	test('returns empty array for null', () => {
		expect(extractAudioTitles(null)).toEqual([]);
	});

	test('returns empty array for invalid JSON', () => {
		expect(extractAudioTitles('not json')).toEqual([]);
	});

	test('returns empty array for JSON without audio', () => {
		expect(extractAudioTitles('{}')).toEqual([]);
	});
});
