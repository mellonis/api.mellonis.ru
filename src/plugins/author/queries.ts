export const authorQuery = `
	SELECT news_text AS text, news_date AS date
	FROM v_news_info
	WHERE news_id = 1;
`;
