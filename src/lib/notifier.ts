export interface Notifier {
	sendActivation(email: string, login: string, key: string): Promise<void>;
	sendPasswordReset(email: string, login: string, key: string): Promise<void>;
	sendPasswordChanged(email: string, login: string): Promise<void>;
}
