import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 10;
const MD5_HASH_LENGTH = 32;

const isMd5Hash = (hash: string): boolean =>
	hash.length === MD5_HASH_LENGTH && /^[0-9a-f]+$/i.test(hash);

export const hashPassword = async (plain: string): Promise<string> =>
	bcrypt.hash(plain, BCRYPT_COST);

export const checkPassword = async (plain: string, storedHash: string): Promise<boolean> => {
	if (isMd5Hash(storedHash)) {
		const md5 = Buffer.from(createHash('md5').update(plain).digest('hex'));
		const stored = Buffer.from(storedHash.toLowerCase());
		return timingSafeEqual(md5, stored);
	}

	return bcrypt.compare(plain, storedHash);
};

export const needsRehash = (storedHash: string): boolean => isMd5Hash(storedHash);
