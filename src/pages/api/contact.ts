export const prerender = false;

import type { APIRoute } from 'astro';
import { validateContact } from '../../lib/validateContact';

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();
  const result = validateContact({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ message: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = (locals as { runtime?: { env?: { RESEND_API_KEY?: string } } })
    .runtime?.env?.RESEND_API_KEY;

  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return new Response(
      JSON.stringify({ message: '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { name, email, message } = result.data;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Insight Brewer 문의 <contact@insightbrewer.com>',
      to: ['contact@insightbrewer.com'],
      reply_to: email,
      subject: `[문의] ${name}님으로부터`,
      text: `이름: ${name}\n이메일: ${email}\n\n${message}`,
    }),
  });

  if (!resendResponse.ok) {
    console.error('Resend API error', resendResponse.status, await resendResponse.text());
    return new Response(
      JSON.stringify({ message: '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ message: '문의가 접수되었습니다. 감사합니다.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
