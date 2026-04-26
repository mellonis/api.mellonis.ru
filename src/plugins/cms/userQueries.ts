// --- Groups ---

export const listGroupsQuery = `
	SELECT id, title, rights FROM auth_group ORDER BY id;
`;

// --- Users ---

export const listUsersQuery = `
	SELECT
		u.id,
		u.login,
		u.email,
		u.r_group_id       AS groupId,
		g.title             AS groupTitle,
		u.rights,
		CAST(u.last_login AS CHAR) AS lastLogin
	FROM auth_user u
	JOIN auth_group g ON u.r_group_id = g.id
	ORDER BY u.id;
`;

export const getUserByIdQuery = `
	SELECT
		u.id,
		u.login,
		u.email,
		u.r_group_id       AS groupId,
		g.title             AS groupTitle,
		u.rights,
		CAST(u.last_login AS CHAR) AS lastLogin
	FROM auth_user u
	JOIN auth_group g ON u.r_group_id = g.id
	WHERE u.id = ?;
`;

export const updateCmsUserQuery = `
	UPDATE auth_user SET r_group_id = ?, rights = ? WHERE id = ?;
`;

export const deleteCmsUserQuery = `
	DELETE FROM auth_user WHERE id = ?;
`;

export const bumpTokenVersionQuery = `
	UPDATE auth_user SET token_version = token_version + 1 WHERE id = ?;
`;
