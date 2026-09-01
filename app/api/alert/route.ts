import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(req: Request) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.error("Missing Twilio credentials.");
      return NextResponse.json({ error: "Missing Twilio config" }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);

    // Grab the data sent from page.tsx, including the new GPS link!
    const { phone, disease, severity, immediateActions, locationUrl } = await req.json();

    const message = await client.messages.create({
      from: "whatsapp:+14155238886", // This is the default Twilio Sandbox number
      to: `whatsapp:${phone}`,
      body: `🚨 *Pashu Rakshak Emergency Alert*\n\n` +
            `*Detected Disease:* ${disease}\n` +
            `*Severity Level:* ${severity}\n` +
            `*Live GPS Location:* ${locationUrl || "Unknown"}\n\n` +
            `*Immediate Advisory:* ${immediateActions || "Isolate animal immediately."}`
    });

    console.log("WhatsApp message sent successfully:", message.sid);
    return NextResponse.json({ success: true, sid: message.sid });

  } catch (err: any) {
    console.error("WhatsApp Dispatch Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}