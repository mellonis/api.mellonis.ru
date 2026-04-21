export const getBookmarksQuery = `
	SELECT
		v.section_identifier        AS sectionId,
		v.thing_position_in_section AS positionInSection,
		v.thing_title               AS title,
		v.thing_first_lines         AS firstLines
	FROM bookmark b
	JOIN v_things_info v ON b.r_thing_id = v.thing_id AND v.section_id = b.r_section_id
	WHERE b.r_user_id = ?
	ORDER BY b.order_index;
`;

export const resolveThingIdQuery = `
	SELECT ti.r_thing_id AS thingId, ti.r_section_id AS sectionId
	FROM thing_identifier ti
	JOIN section s ON ti.r_section_id = s.id
	WHERE s.identifier = ? AND ti.thing_position_in_section = ?;
`;

export const addBookmarkQuery = `
	INSERT INTO bookmark (r_user_id, r_thing_id, r_section_id, order_index)
	VALUES (?, ?, ?, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM bookmark AS b WHERE b.r_user_id = ?));
`;

export const deleteBookmarkQuery = `
	DELETE FROM bookmark WHERE r_user_id = ? AND r_thing_id = ? AND r_section_id = ?;
`;

export const deleteAllBookmarksQuery = `
	DELETE FROM bookmark WHERE r_user_id = ?;
`;

export const insertBookmarkWithOrderQuery = `
	INSERT IGNORE INTO bookmark (r_user_id, r_thing_id, r_section_id, order_index) VALUES (?, ?, ?, ?);
`;
