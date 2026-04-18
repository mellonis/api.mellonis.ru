import { describe, expect, it } from 'vitest';
import {
	resolveRights,
	isEmailActivated,
	isBanned,
	isPasswordResetRequested,
	setEmailActivated,
	setPasswordResetRequested,
	clearPasswordResetRequested,
} from './rights.js';

describe('resolveRights', () => {
	// Bits 3..10 rule: (!group) && user
	it('canVote: false when neither side has bit 3', () => {
		expect(resolveRights(0, 0)).toEqual({ canVote: false });
	});

	it('canVote: true when user opts in (group has no bit 3)', () => {
		expect(resolveRights(8, 0)).toEqual({ canVote: true });
	});

	it('canVote: false when group blocks (group has bit 3, user does not)', () => {
		expect(resolveRights(0, 8)).toEqual({ canVote: false });
	});

	it('canVote: false when group blocks (both sides have bit 3)', () => {
		expect(resolveRights(8, 8)).toEqual({ canVote: false });
	});

	it('resolves default new user rights (24 = can_vote + can_comment)', () => {
		expect(resolveRights(24, 0)).toEqual({ canVote: true });
	});

	// Banned override
	it('zeros all rights when user is banned (bit 2)', () => {
		expect(resolveRights(8 | 4, 0)).toEqual({ canVote: false });
	});

	it('zeros all rights when group is banned (bit 2)', () => {
		expect(resolveRights(8, 4)).toEqual({ canVote: false });
	});
});

describe('status bit helpers', () => {
	it('isEmailActivated detects bit 0', () => {
		expect(isEmailActivated(0)).toBe(false);
		expect(isEmailActivated(1)).toBe(true);
		expect(isEmailActivated(25)).toBe(true); // 24 + 1
	});

	it('isBanned detects bit 2', () => {
		expect(isBanned(0)).toBe(false);
		expect(isBanned(4)).toBe(true);
		expect(isBanned(5)).toBe(true); // 4 + 1
	});

	it('isPasswordResetRequested detects bit 1', () => {
		expect(isPasswordResetRequested(0)).toBe(false);
		expect(isPasswordResetRequested(2)).toBe(true);
	});

	it('setEmailActivated sets bit 0', () => {
		expect(setEmailActivated(24)).toBe(25);
		expect(setEmailActivated(25)).toBe(25); // idempotent
	});

	it('setPasswordResetRequested sets bit 1', () => {
		expect(setPasswordResetRequested(25)).toBe(27);
	});

	it('clearPasswordResetRequested clears bit 1', () => {
		expect(clearPasswordResetRequested(27)).toBe(25);
		expect(clearPasswordResetRequested(25)).toBe(25); // already clear
	});
});
