// --- Section types ---

export const sectionTypesQuery = `
	SELECT id, title FROM section_type WHERE id > 0 ORDER BY id;
`;

// --- Sections ---

export const cmsSectionsQuery = `
	SELECT
		s.id,
		s.identifier,
		s.title,
		s.description,
		s.annotation_text             AS annotationText,
		s.annotation_author           AS annotationAuthor,
		s.r_section_type_id           AS typeId,
		s.r_redirect_section_id       AS redirectSectionId,
		s.settings,
		s.\`order\`
	FROM section s
	WHERE s.r_section_type_id > 0
	ORDER BY s.\`order\`, s.id;
`;

export const cmsSectionByIdQuery = `
	SELECT
		s.id,
		s.identifier,
		s.title,
		s.description,
		s.annotation_text             AS annotationText,
		s.annotation_author           AS annotationAuthor,
		s.r_section_type_id           AS typeId,
		s.r_redirect_section_id       AS redirectSectionId,
		s.settings,
		s.\`order\`
	FROM section s
	WHERE s.id = ?;
`;

export const createSectionQuery = `
	INSERT INTO section (identifier, title, description, annotation_text, annotation_author, r_section_type_id, r_redirect_section_id, settings, \`order\`)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

export const updateSectionQuery = `
	UPDATE section
	SET title = ?, description = ?, annotation_text = ?, annotation_author = ?,
		r_section_type_id = ?, r_redirect_section_id = ?, settings = ?
	WHERE id = ?;
`;

export const deleteSectionQuery = `
	DELETE FROM section WHERE id = ?;
`;

export const deleteAllThingsInSectionQuery = `
	DELETE FROM thing_identifier WHERE r_section_id = ?;
`;

export const externalRedirectsToSectionQuery = `
	SELECT
		ext.r_section_id AS fromSectionId,
		s.identifier AS fromSectionIdentifier,
		ext.r_thing_id AS fromThingId
	FROM thing_identifier ext
	JOIN thing_identifier target ON ext.r_redirect_thing_identifier_id = target.id
	JOIN section s ON ext.r_section_id = s.id
	WHERE target.r_section_id = ? AND ext.r_section_id != ?;
`;

export const updateSectionOrderQuery = `
	UPDATE section SET \`order\` = ? WHERE id = ?;
`;

export const shiftSectionOrdersQuery = `
	UPDATE section SET \`order\` = \`order\` + 1
	WHERE r_section_type_id > 0 AND \`order\` >= ?;
`;

export const maxSectionOrderQuery = `
	SELECT COALESCE(MAX(\`order\`), 0) AS maxOrder
	FROM section WHERE r_section_type_id > 0;
`;

// For redirect loop detection
export const allSectionRedirectsQuery = `
	SELECT id, r_redirect_section_id AS redirectSectionId
	FROM section;
`;

// --- Things in section ---

export const cmsSectionThingsQuery = `
	SELECT
		ti.r_thing_id                  AS thingId,
		ti.thing_position_in_section   AS position,
		t.title,
		t.first_lines                  AS firstLines
	FROM thing_identifier ti
	JOIN thing t ON ti.r_thing_id = t.id
	WHERE ti.r_section_id = ?
	ORDER BY ti.thing_position_in_section;
`;

export const addThingToSectionQuery = `
	INSERT INTO thing_identifier (r_section_id, thing_position_in_section, r_thing_id)
	VALUES (?, ?, ?);
`;

export const maxThingPositionQuery = `
	SELECT COALESCE(MAX(thing_position_in_section), 0) AS maxPosition
	FROM thing_identifier WHERE r_section_id = ?;
`;

export const shiftThingPositionsQuery = `
	UPDATE thing_identifier
	SET thing_position_in_section = thing_position_in_section + 1
	WHERE r_section_id = ? AND thing_position_in_section >= ?;
`;

export const removeThingFromSectionQuery = `
	DELETE FROM thing_identifier WHERE r_section_id = ? AND r_thing_id = ?;
`;

export const updateThingPositionQuery = `
	UPDATE thing_identifier
	SET thing_position_in_section = ?
	WHERE r_section_id = ? AND r_thing_id = ?;
`;

export const thingExistsQuery = `
	SELECT id FROM thing WHERE id = ?;
`;

export const sectionThingIdsQuery = `
	SELECT r_thing_id AS thingId
	FROM thing_identifier
	WHERE r_section_id = ?
	ORDER BY thing_position_in_section;
`;
