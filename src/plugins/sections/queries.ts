export const sectionsQuery = `
    SELECT
      section_identifier AS id,
      section_type_id AS typeId,
      section_title AS title,
      section_description AS description,
      settings,
      section_things_count AS thingsCount
    FROM v_sections_info
    WHERE section_type_id > 0;
  `;

export const sectionThingsQuery = `
    SELECT
      thing_id AS id,
      thing_position_in_section AS position,
      thing_category_id AS categoryId,
      thing_title AS title,
      thing_first_lines AS firstLines,
      thing_start_date AS startDate,
      thing_finish_date AS finishDate,
      thing_text AS text
    FROM
      v_things_info
    WHERE
      section_identifier = ?;
  `;

export const thinNotesQuery = `
    SELECT
      id,
      text,
      r_thing_id AS thingId
    FROM
      thing_note
    WHERE
      r_thing_id IN (?)
    ORDER BY id ASC;
  `;
