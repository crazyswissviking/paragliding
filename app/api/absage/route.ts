import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { terminId, titel, datum, wochentag, begruendung } = await request.json();

    const { data: anmeldungenData } = await supabase
    .from("anmeldungen")
    .select("name, email")
    .eq("termin", label);

  console.log("Label:", label);
  console.log("Anmeldungen gefunden:", anmeldungenData);

  const anmeldungen = anmeldungenData;

  const label = `${wochentag}, ${datum}`;

  const { data: anmeldungen } = await supabase
    .from("anmeldungen")
    .select("name, email")
    .eq("termin", label);

  if (!anmeldungen || anmeldungen.length === 0) {
    return NextResponse.json({ success: true, gesendet: 0 });
  }

  let gesendet = 0;
  for (const a of anmeldungen) {
    const { error } = await resend.emails.send({
      from: "VikingFly <noreply@vikingfly.ch>",
      to: a.email,
      subject: `❌ Abgesagt – ${titel}, ${datum}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #e74c3c;">🪂 VikingFly</h1>
          <p>Hallo ${a.name}</p>
          <p>Leider müssen wir dir mitteilen, dass folgender Event abgesagt wurde:</p>
          <div style="background: #fdecea; padding: 16px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <p style="margin: 0 0 4px; font-size: 18px; font-weight: bold; color: #c0392b;">❌ ${titel}</p>
            <p style="margin: 0; font-size: 14px; color: #888;">${datum}</p>
          </div>
          ${begruendung ? `
          <div style="background: #f9f9f9; padding: 16px; border-radius: 10px; margin: 16px 0;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #555;">Begründung:</p>
            <p style="margin: 0; color: #555;">${begruendung}</p>
          </div>
          ` : ""}
          <p>Wir hoffen auf bessere Bedingungen beim nächsten Mal. Die Wikinger geben nicht auf! 🛡️</p>
          <p style="color: #aaa; font-size: 12px; margin-top: 30px;">VikingFly – Wo Berge zu Flügeln werden</p>
        </div>
      `,
    });
    if (!error) gesendet++;
  }

  return NextResponse.json({ success: true, gesendet });
}