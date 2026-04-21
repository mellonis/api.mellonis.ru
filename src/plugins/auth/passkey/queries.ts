export const insertPasskeyQuery = `
	INSERT INTO auth_passkey (r_user_id, credential_id, public_key, counter, transports, name)
	VALUES (?, ?, ?, ?, ?, ?)
`;

export const findPasskeysByUserIdQuery = `
	SELECT id, credential_id, public_key, counter, transports, name, created_at, last_used_at
	FROM auth_passkey
	WHERE r_user_id = ?
`;

export const findPasskeyByCredentialIdQuery = `
	SELECT p.id AS passkey_id, p.r_user_id, p.credential_id, p.public_key, p.counter, p.transports, p.name,
	       u.user_id, u.user_login, u.user_rights, u.group_id, u.group_rights, u.token_version
	FROM auth_passkey p
	JOIN v_users_info u ON u.user_id = p.r_user_id
	WHERE p.credential_id = ?
`;

export const updatePasskeyCounterQuery = `
	UPDATE auth_passkey SET counter = ?, last_used_at = NOW() WHERE id = ?
`;

export const deletePasskeyQuery = `
	DELETE FROM auth_passkey WHERE id = ? AND r_user_id = ?
`;
