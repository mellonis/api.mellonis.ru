const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

interface StoredChallenge {
	challenge: string;
	createdAt: number;
}

export interface ChallengeStore {
	set(key: string, challenge: string): void;
	get(key: string): string | null;
	startCleanup(): void;
	stopCleanup(): void;
}

export const createChallengeStore = (ttlMs: number = DEFAULT_TTL_MS): ChallengeStore => {
	const store = new Map<string, StoredChallenge>();
	let cleanupTimer: ReturnType<typeof setInterval> | null = null;

	const isExpired = (entry: StoredChallenge): boolean =>
		Date.now() - entry.createdAt > ttlMs;

	return {
		set(key: string, challenge: string): void {
			store.set(key, { challenge, createdAt: Date.now() });
		},

		get(key: string): string | null {
			const entry = store.get(key);
			store.delete(key); // one-time use

			if (!entry || isExpired(entry)) {
				return null;
			}

			return entry.challenge;
		},

		startCleanup(): void {
			cleanupTimer = setInterval(() => {
				for (const [key, entry] of store) {
					if (isExpired(entry)) {
						store.delete(key);
					}
				}
			}, CLEANUP_INTERVAL_MS);
			cleanupTimer.unref();
		},

		stopCleanup(): void {
			if (cleanupTimer) {
				clearInterval(cleanupTimer);
				cleanupTimer = null;
			}
		},
	};
};
