// Transactional email templates. Georgian first, English second, plain & accessible.
// All interpolated values are HTML-escaped.

export type Rendered = { subject: string; html: string; text: string };

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="ka"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:Arial,'Noto Sans Georgian',sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#0a0a0a;padding:20px 28px;color:#fff;font-weight:700;letter-spacing:3px;font-size:18px">ASPOR<span style="color:#FCCE00">/</span></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px;background:#fafafa;color:#666;font-size:12px">ASPOR · aspor.ge — ეს არის ავტომატური შეტყობინება. / This is an automated message.</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">${esc(label)}</a></p>`;

export function applicationReceived(p: { contactName: string; companyName: string }): Rendered {
  const subject = 'ASPOR — განაცხადი მიღებულია / Application received';
  const html = layout(subject, `<p>გამარჯობა, ${esc(p.contactName)}!</p>
<p>მადლობა, რომ დაინტერესდით ASPOR-თან პარტნიორობით. კომპანია „${esc(p.companyName)}“-ის განაცხადი მიღებულია და განიხილება. შედეგს ელფოსტით გაცნობებთ.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p>Hello ${esc(p.contactName)}, thank you for applying to become an ASPOR partner. Your application for “${esc(p.companyName)}” has been received and is under review. We will email you the result.</p>`);
  const text = `გამარჯობა, ${p.contactName}!\nკომპანია „${p.companyName}“-ის განაცხადი მიღებულია და განიხილება.\n\nHello ${p.contactName}, your application for "${p.companyName}" has been received and is under review.`;
  return { subject, html, text };
}

export function applicationAdminNotify(p: { companyName: string; companyCode: string; contactName: string; email: string; phone: string; adminUrl: string }): Rendered {
  const subject = `ახალი B2B განაცხადი: ${p.companyName}`;
  const rows = [
    ['კომპანია', p.companyName], ['ს/კ', p.companyCode], ['საკონტაქტო პირი', p.contactName], ['ელფოსტა', p.email], ['ტელეფონი', p.phone],
  ].map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
  const html = layout(subject, `<p>შემოვიდა ახალი პარტნიორობის განაცხადი.</p><table>${rows}</table>${button(p.adminUrl, 'ადმინ პანელში ნახვა')}`);
  const text = `ახალი განაცხადი: ${p.companyName} (${p.companyCode})\n${p.contactName} · ${p.email} · ${p.phone}\n${p.adminUrl}`;
  return { subject, html, text };
}

export function applicationApproved(p: { contactName: string; setupUrl: string; expiresHours: number }): Rendered {
  const subject = 'ASPOR — განაცხადი დამტკიცდა / Application approved';
  const html = layout(subject, `<p>გამარჯობა, ${esc(p.contactName)}!</p>
<p>თქვენი პარტნიორობის განაცხადი დამტკიცებულია. პარტნიორის კაბინეტის გასააქტიურებლად შექმენით პაროლი. ბმული ერთჯერადია და მოქმედებს ${p.expiresHours} საათის განმავლობაში.</p>
${button(p.setupUrl, 'პაროლის შექმნა / Set password')}
<p style="color:#666;font-size:13px">Your ASPOR partner application has been approved. Use the one-time link above (valid for ${p.expiresHours} hours) to set your password. If you did not apply, ignore this email.</p>`);
  const text = `გამარჯობა, ${p.contactName}!\nგანაცხადი დამტკიცდა. პაროლის შექმნა (ერთჯერადი ბმული, ${p.expiresHours} სთ):\n${p.setupUrl}\n\nApproved. Set your password (one-time link, ${p.expiresHours}h): ${p.setupUrl}`;
  return { subject, html, text };
}

export function applicationRejected(p: { contactName: string }): Rendered {
  const subject = 'ASPOR — განაცხადის სტატუსი / Application status';
  const html = layout(subject, `<p>გამარჯობა, ${esc(p.contactName)}!</p>
<p>მადლობა ინტერესისთვის. სამწუხაროდ, ამ ეტაპზე თქვენს განაცხადს ვერ დავაკმაყოფილებთ. კითხვების შემთხვევაში დაგვიკავშირდით საიტის საკონტაქტო ფორმით.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p>Thank you for your interest. Unfortunately we cannot approve your application at this time. Feel free to contact us via the website.</p>`);
  const text = `გამარჯობა, ${p.contactName}!\nსამწუხაროდ, ამ ეტაპზე განაცხადს ვერ დავაკმაყოფილებთ.\n\nUnfortunately we cannot approve your application at this time.`;
  return { subject, html, text };
}

export function passwordReset(p: { resetUrl: string; expiresMinutes: number }): Rendered {
  const subject = 'ASPOR — პაროლის აღდგენა / Password reset';
  const html = layout(subject, `<p>მივიღეთ პაროლის აღდგენის მოთხოვნა. ახალი პაროლის დასაყენებლად გამოიყენეთ ერთჯერადი ბმული (${p.expiresMinutes} წუთი).</p>
${button(p.resetUrl, 'პაროლის აღდგენა / Reset password')}
<p style="color:#666;font-size:13px">We received a password reset request. The link is valid for ${p.expiresMinutes} minutes and can be used once. If you did not request this, ignore this email — your password stays unchanged.</p>`);
  const text = `პაროლის აღდგენა (${p.expiresMinutes} წთ): ${p.resetUrl}\n\nPassword reset (${p.expiresMinutes} min): ${p.resetUrl}`;
  return { subject, html, text };
}

export function contactAdminNotify(p: { name: string; email: string; phone?: string | null; subject?: string | null; message: string; adminUrl: string }): Rendered {
  const subject = `საკონტაქტო ფორმა: ${p.subject || p.name}`;
  const html = layout(subject, `<p><strong>${esc(p.name)}</strong> &lt;${esc(p.email)}&gt;${p.phone ? ' · ' + esc(p.phone) : ''}</p>
<blockquote style="margin:0;padding:12px 16px;background:#fafafa;border-left:3px solid #FCCE00;white-space:pre-wrap">${esc(p.message)}</blockquote>${button(p.adminUrl, 'ადმინ პანელში ნახვა')}`);
  const text = `${p.name} <${p.email}> ${p.phone ?? ''}\n\n${p.message}\n\n${p.adminUrl}`;
  return { subject, html, text };
}
