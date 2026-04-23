export const authorQuery = `
	SELECT news_text AS text
	FROM v_news_info
	WHERE news_id = 1;
`;
