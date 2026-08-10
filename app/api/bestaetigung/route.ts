import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { name, email, termin, titel, anmeldungId } = await request.json();

  const abmeldeLink = `https://vikingfly.ch/termine/abmelden?id=${anmeldungId}`;

  const { error } = await resend.emails.send({
    from: "VikingFly <noreply@vikingfly.ch>",
    to: email,
    subject: `Anmeldebestätigung – ${titel || "Event"}, ${termin}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px;">
        <h1 style="color: #3355cc;">🪂 VikingFly</h1>
        <p>Hallo ${name}</p>
        <p>Deine Anmeldung wurde erfolgreich gespeichert!</p>
        <div style="background: #f0f4ff; padding: 16px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0 0 4px; font-size: 18px; font-weight: bold;">${titel || "Event"}</p>
          <p style="margin: 0; font-size: 14px; color: #555;">${termin}</p>
        </div>
        <p>Wir freuen uns auf dich! 🏔🪂</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #888; font-size: 13px;">
          Falls du deine Anmeldung rückgängig machen möchtest, kannst du dich hier abmelden:
        </p>
        <a href="${abmeldeLink}" style="display: inline-block; padding: 10px 20px; background: #e74c3c; color: white; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; margin-top: 8px;">
          ❌ Abmelden
        </a>
        <p style="color: #aaa; font-size: 12px; margin-top: 30px;">VikingFly – Wo Berge zu Flügeln werden</p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}