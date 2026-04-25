export const authorQuery = `
	SELECT news_text AS text, news_date AS date,
		news_seo_description AS seoDescription, news_seo_keywords AS seoKeywords
	FROM v_news_info
	WHERE news_id = 1;
`;
