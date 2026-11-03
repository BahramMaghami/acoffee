function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

export function passwordResetEmail(link: string) {
  const safeLink = escapeHtml(link)
  return {
    subject: 'بازیابی رمز عبور حساب آ',
    text: `یک قدم تا بازگشت به آ\n\nبرای تعیین رمز جدید حسابت، لینک زیر را باز کن:\n${link}\n\nاین لینک تا ۳۰ دقیقه معتبر است و فقط یک بار استفاده می‌شود.\n\nاگر این درخواست را ثبت نکرده‌ای، نیازی به انجام کاری نیست؛ رمز حسابت تغییر نکرده است.\n\nآ؛ قهوه، به وقت خودت.`,
    html: `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>بازیابی رمز عبور آ</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    a:focus-visible { outline: 3px solid #806744; outline-offset: 4px; }
    @media only screen and (max-width: 480px) {
      .outer { padding: 20px 12px !important; }
      .content { padding: 28px 22px !important; }
      .brand { padding: 24px 22px !important; }
      .heading { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#ebe2d4;font-family:Tahoma,Arial,sans-serif;color:#24211e;">
  <div style="display:none;font-size:1px;line-height:1px;color:#ebe2d4;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">لینک تعیین رمز جدید حساب آ؛ تا ۳۰ دقیقه معتبر است.</div>
  <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ebe2d4">
    <tr><td class="outer" align="center" style="padding:40px 16px;">
      <!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border:1px solid #d9cebc;" bgcolor="#f6f1e8">
        <tr><td height="5" bgcolor="#8c252d" style="height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td class="brand" bgcolor="#1c1b19" style="padding:28px 36px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="right" style="color:#fff8ee;font-size:52px;line-height:1.4;font-weight:bold;">آ<span style="color:#c6ad7e;">.</span></td>
              <td align="left" style="color:#c6ad7e;font-size:11px;line-height:2;"><span dir="ltr" style="font-family:Arial,sans-serif;letter-spacing:2px;">ACOFFEE</span><br /><span style="color:#d0c6b7;">قهوه، به وقت خودت.</span></td>
            </tr>
          </table>
        </td></tr>
        <tr><td class="content" align="right" style="padding:36px;">
          <p style="margin:0 0 12px;color:#806744;font-size:12px;line-height:1.8;">حساب کاربری شما</p>
          <h1 class="heading" style="margin:0 0 18px;color:#24211e;font-size:28px;line-height:1.7;font-weight:bold;">یک قدم تا بازگشت به آ.</h1>
          <p style="margin:0 0 24px;color:#6d655b;font-size:14px;line-height:2.2;">درخواست تغییر رمز حسابت را دریافت کردیم.<br />برای انتخاب رمز جدید، روی دکمهٔ زیر بزن.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" bgcolor="#8c252d" style="border-radius:4px;mso-padding-alt:16px 32px;">
              <a href="${safeLink}" style="display:inline-block;padding:16px 32px;border:1px solid #8c252d;border-radius:4px;background-color:#8c252d;color:#fff8ee;font-family:Tahoma,Arial,sans-serif;font-size:15px;font-weight:bold;line-height:1.6;text-decoration:none;">تعیین رمز جدید</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 28px;color:#6d655b;font-size:12px;line-height:2;">اعتبار لینک: <strong style="color:#24211e;">۳۰ دقیقه</strong> &nbsp;·&nbsp; فقط یک بار قابل استفاده</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eee7dc">
            <tr><td style="padding:16px 18px;border-right:3px solid #c6ad7e;color:#6d655b;font-size:12px;line-height:2.1;">این درخواست از طرف تو نبوده؟<br />نیازی به انجام کاری نیست؛ رمز حسابت تغییر نکرده است.</td></tr>
          </table>
          <p style="margin:28px 0 8px;color:#6d655b;font-size:11px;line-height:2;">اگر دکمه باز نمی‌شود، این لینک را در مرورگرت کپی کن:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
            <tr><td dir="ltr" align="left" style="word-break:break-all;overflow-wrap:anywhere;font-family:Arial,sans-serif;font-size:11px;line-height:1.9;"><a href="${safeLink}" style="color:#8c252d;text-decoration:underline;">${safeLink}</a></td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:20px 24px;border-top:1px solid #d9cebc;color:#6d655b;font-size:11px;line-height:2;">آ؛ با حوصله، برای تو.</td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`,
  }
}
