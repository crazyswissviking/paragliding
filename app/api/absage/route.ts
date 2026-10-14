import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  console.log("Absage API aufgerufen");
  console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "vorhanden" : "FEHLT");
  console.log("SERVICE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "vorhanden" : "FEHLT");
  console.log("RESEND_KEY:", process.env.RESEND_API_KEY ? "vorhanden" : "FEHLT");

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { titel, datum, wochentag, begruendung } = await request.json();
    const label = `${wochentag}, ${datum}`;

    console.log("Label:", label);

    const { data: personen, error: dbError } = await supabase
      .from("anmeldungen")
      .select("name, email")
      .eq("termin", label);

    console.log("Anmeldungen gefunden:", personen);
    console.log("DB Error:", dbError);

    if (!personen || personen.length === 0) {
      return NextResponse.json({ success: true, gesendet: 0 });
    }

    let gesendet = 0;
    for (const a of personen) {
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
      console.log("Mail an:", a.email, "Fehler:", error);
      if (!error) gesendet++;
    }

    return NextResponse.json({ success: true, gesendet });

  } catch (err) {
    console.error("Fehler in Absage API:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}