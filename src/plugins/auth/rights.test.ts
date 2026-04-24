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
		expect(resolveRights(0, 0)).toEqual({ canVote: false, canEditContent: false });
	});

	it('canVote: true when user opts in (group has no bit 3)', () => {
		expect(resolveRights(8, 0)).toEqual({ canVote: true, canEditContent: false });
	});

	it('canVote: false when group blocks (group has bit 3, user does not)', () => {
		expect(resolveRights(0, 8)).toEqual({ canVote: false, canEditContent: false });
	});

	it('canVote: false when group blocks (both sides have bit 3)', () => {
		expect(resolveRights(8, 8)).toEqual({ canVote: false, canEditContent: false });
	});

	it('resolves default new user rights (24 = can_vote + can_comment)', () => {
		expect(resolveRights(24, 0)).toEqual({ canVote: true, canEditContent: false });
	});

	// Bits 11..15 rule: XOR (group default, user override)
	it('canEditContent: true when group has bit 12 (editors group = 30720)', () => {
		expect(resolveRights(24, 30720).canEditContent).toBe(true);
	});

	it('canEditContent: false when user overrides group bit 12 off', () => {
		// XOR: both have bit 12 → false
		expect(resolveRights(24 | 4096, 30720).canEditContent).toBe(false);
	});

	it('canEditContent: true when user overrides with bit 12 (group has no bit 12)', () => {
		expect(resolveRights(4096, 0).canEditContent).toBe(true);
	});

	it('canEditContent: false when neither side has bit 12', () => {
		expect(resolveRights(0, 0).canEditContent).toBe(false);
	});

	// Banned override
	it('zeros all rights when user is banned (bit 2)', () => {
		expect(resolveRights(8 | 4, 0)).toEqual({ canVote: false, canEditContent: false });
	});

	it('zeros all rights when group is banned (bit 2)', () => {
		expect(resolveRights(8, 4)).toEqual({ canVote: false, canEditContent: false });
	});

	it('zeros canEditContent when banned even if group has bit 12', () => {
		expect(resolveRights(4, 30720).canEditContent).toBe(false);
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
