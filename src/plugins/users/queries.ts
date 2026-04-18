export const getUserPasswordAndEmailQuery = `
	SELECT id, password_hash, email
	FROM auth_user
	WHERE id = ?
`;

export const updatePasswordQuery = `
	UPDATE auth_user
	SET password_hash = ?
	WHERE id = ?
`;

export const deleteUserQuery = `
	DELETE
	FROM auth_user
	WHERE id = ?
`;
