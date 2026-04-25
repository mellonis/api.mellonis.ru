import { thingFields, userVoteField } from '../../lib/queries.js';

const sectionFields = `
	section_identifier        AS id,
	section_type_id           AS typeId,
	section_title             AS title,
	section_description       AS description,
	section_annotation_text   AS annotationText,
	section_annotation_author AS annotationAuthor,
	settings,
	section_things_count      AS thingsCount
`;

export const sectionsQuery = `
	SELECT ${sectionFields}
	FROM v_sections_info
	WHERE section_status_id IN (2, 3);
`;

export const sectionByIdQuery = `
	SELECT ${sectionFields}
	FROM v_sections_info
	WHERE section_status_id IN (2, 3)
		AND section_identifier = ?;
`;

const extendedThingFields = `
	${thingFields},
	section_identifier        AS sectionId,
	thing_position_in_section AS position
`;

export const sectionThingsQuery = `
	SELECT ${extendedThingFields}
	FROM v_things_info
	WHERE section_identifier = ?;
`;

export const sectionThingsWithUserVoteQuery = `
	SELECT ${extendedThingFields},
	${userVoteField}
	FROM v_things_info
	WHERE section_identifier = ?;
`;
