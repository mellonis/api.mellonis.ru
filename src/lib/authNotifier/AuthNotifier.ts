export interface AuthNotifier {
	sendActivation(email: string, login: string, key: string, origin: string): Promise<void>;
	sendPasswordReset(email: string, login: string, key: string, origin: string): Promise<void>;
	sendPasswordChanged(email: string, login: string, origin: string): Promise<void>;
}
