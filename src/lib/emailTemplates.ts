import type { EmailMessage } from './email.js';

const layout = (siteOrigin: string, login: string, body: string): string => {
	const siteTitle = new URL(siteOrigin).hostname;

	return `<html lang="ru"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
 style="background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#333333;padding:20px 30px;">
<a href="${siteOrigin}" style="color:#ffffff;text-decoration:none;
font-size:18px;">${siteTitle}</a>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">Здравствуйте,
 <strong>${login}</strong>!</p>
${body}
<p style="color:#999;font-size:13px;margin-top:30px;
border-top:1px solid #eee;padding-top:15px;">
<em>С уважением и признательностью, Гильмуллин Руслан</em></p>
</td></tr></table>
</td></tr></table>
</body></html>`;
};

export const activationEmail = (siteOrigin: string, login: string, href: string): EmailMessage => ({
	subject: 'Подтверждение email',
	html: layout(siteOrigin, login, `<p style="color:#333;font-size:14px;">На данный email-адрес
 произведена регистрация на сайте.</p>
<p style="text-align:center;margin:25px 0;">
<a href="${href}" style="display:inline-block;background:#333;color:#fff;
padding:12px 30px;border-radius:5px;text-decoration:none;font-size:14px;">
Подтвердить email</a></p>
<p style="color:#999;font-size:12px;">Или скопируйте ссылку:
<a href="${href}" style="color:#666;">${href}</a></p>`),
});

export const resetPasswordEmail = (siteOrigin: string, login: string, href: string): EmailMessage => ({
	subject: 'Сброс пароля',
	html: layout(siteOrigin, login, `<p style="color:#333;font-size:14px;">Получен запрос на сброс
 пароля для вашего аккаунта.</p>
<p style="text-align:center;margin:25px 0;">
<a href="${href}" style="display:inline-block;background:#333;color:#fff;
padding:12px 30px;border-radius:5px;text-decoration:none;font-size:14px;">
Сбросить пароль</a></p>
<p style="color:#999;font-size:12px;">Или скопируйте ссылку:
<a href="${href}" style="color:#666;">${href}</a></p>
<p style="color:#999;font-size:12px;">Если вы не запрашивали сброс пароля,
 просто проигнорируйте это письмо.</p>`),
});

export const passwordChangedEmail = (siteOrigin: string, login: string, resetHref: string): EmailMessage => ({
	subject: 'Пароль изменён',
	html: layout(siteOrigin, login, `<p style="color:#333;font-size:14px;">Пароль для вашего
 аккаунта был успешно изменён.</p>
<div style="background:#fff3cd;border:1px solid #ffc107;
border-radius:5px;padding:15px;margin:20px 0;">
<p style="color:#856404;font-size:14px;margin:0;">
Если вы не меняли пароль, немедленно
<a href="${resetHref}" style="color:#856404;font-weight:bold;">
сбросьте его</a>.</p></div>`),
});
