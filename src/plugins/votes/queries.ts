export const upsertVoteQuery = `
	INSERT INTO vote (r_thing_id, r_user_id, vote, date)
	VALUES (?, ?, ?, CURDATE())
	ON DUPLICATE KEY UPDATE vote = VALUES(vote), date = CURDATE()
`;

export const deleteVoteQuery = `
	DELETE FROM vote
	WHERE r_thing_id = ? AND r_user_id = ?
`;

export const voteCountsQuery = `
	SELECT
		COUNT(CASE WHEN vote > 0 THEN 1 END) AS plus,
		COUNT(CASE WHEN vote < 0 THEN 1 END) AS minus
	FROM vote
	WHERE r_thing_id = ?
`;
