import { describe, expect, it } from 'vitest';
import { hashPassword, checkPassword, needsRehash } from './password.js';

describe('password', () => {
	it('hashes and verifies a password with bcrypt', async () => {
		const hash = await hashPassword('secret123');
		expect(hash).toMatch(/^\$2[aby]\$/);
		expect(await checkPassword('secret123', hash)).toBe(true);
		expect(await checkPassword('wrong', hash)).toBe(false);
	});

	it('verifies legacy MD5 hash', async () => {
		// MD5 of "testpass" = 179ad45c6ce2cb97cf1029e212046e81
		const md5Hash = '179ad45c6ce2cb97cf1029e212046e81';
		expect(await checkPassword('testpass', md5Hash)).toBe(true);
		expect(await checkPassword('wrong', md5Hash)).toBe(false);
	});

	it('needsRehash returns true for MD5 hashes', () => {
		expect(needsRehash('179ad45c6ce2cb97cf1029e212046e81')).toBe(true);
	});

	it('needsRehash returns false for bcrypt hashes', async () => {
		const hash = await hashPassword('test');
		expect(needsRehash(hash)).toBe(false);
	});

	it('needsRehash returns false for non-hex 32-char strings', () => {
		expect(needsRehash('not-a-hex-string-of-length-32!!!!')).toBe(false);
	});
});
