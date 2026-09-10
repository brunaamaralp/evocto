/**
 * Notify client about material review link (email / WhatsApp helpers).
 */

function normalizePhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return d;
  if (d.length >= 10 && d.length <= 11) return `55${d}`;
  return d;
}

export function buildReviewMessage({ title, reviewUrl, agencyName }) {
  const who = agencyName ? `${agencyName}` : 'a agência';
  return (
    `Olá! ${who} enviou o material "${title}" para sua aprovação.\n\n` +
    `Abra o link para visualizar e aprovar ou solicitar alterações:\n${reviewUrl}`
  );
}

export function buildWhatsAppShareUrl({ phone, text }) {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export async function sendReviewEmail({ to, subject, text, html }) {
  const apiKey = String(process.env.SENDGRID_API_KEY || '').trim();
  const from = String(process.env.EMAIL_FROM || 'noreply@evocto.com').trim();
  if (!apiKey) {
    return {
      ok: false,
      channel: 'email',
      reason: 'sendgrid_not_configured',
      mailto: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    };
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [
        { type: 'text/plain', value: text },
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      ok: false,
      channel: 'email',
      reason: 'sendgrid_error',
      detail: body.slice(0, 300),
      mailto: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    };
  }

  return { ok: true, channel: 'email', provider: 'sendgrid' };
}
