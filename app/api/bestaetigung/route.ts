import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend("re_MkB8DTmp_GBWHpQoKGELiLdx3vpRiQw7P"); // deinen Key hier einfügen

export async function POST(request: Request) {
  const { name, email, termin } = await request.json();

  const { error } = await resend.emails.send({
    from: "Swissgliders Members <onboarding@resend.dev>",
    to: email,
    subject: "Anmeldebestätigung – Vollmond-/Nachtflug",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px;">
        <h1 style="color: #3355cc;">🪂 Swissgliders Members</h1>
        <p>Hallo ${name}</p>
        <p>Deine Anmeldung wurde erfolgreich gespeichert!</p>
        <div style="background: #f0f4ff; padding: 16px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: bold;">🌕 ${termin}</p>
        </div>
        <p>Wir freuen uns auf dich!</p>
        <p style="color: #888; font-size: 14px;">Swissgliders Members Team</p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}