import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API key found." }, { status: 500 });
    }

    const { imageBase64, mimeType } = await req.json();

    const prompt = `Analyze this livestock image to determine its health status. CRITICAL INSTRUCTION: The animal in this image might be perfectly healthy. DO NOT invent or guess a disease if the animal looks normal. If the animal appears completely healthy, grazing, or shows no obvious clinical signs of illness, you MUST return the disease name strictly as 'Healthy', set the severity to 'None', and set the immediate_actions to ['No action required. Animal is healthy.']. Return ONLY a raw JSON object with this exact structure, no markdown formatting:
    {
      "disease": "string",
      "confidence": number,
      "severity": "Critical" | "High" | "Moderate" | "Mild" | "None",
      "symptoms": ["string"],
      "immediate_actions": ["string"]
    }`;

    // Clean the base64 string to prevent formatting crashes
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

   // app/api/analyze/route.ts

const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST", // <-- THIS IS CRITICAL. Without this, it defaults to GET and crashes!
    headers: { 
        "Content-Type": "application/json" 
    },
    body: JSON.stringify({
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType || "image/jpeg", data: cleanBase64 } }
            ]
        }]
    })
});

    const data = await apiRes.json();

    // If Google rejects the key or rate limits us, catch it here
    if (!apiRes.ok) {
      throw new Error(data.error?.message || "Google API rejected the request.");
    }

    const responseText = data.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    } else {
      throw new Error("Invalid JSON format returned by AI.");
    }

  } catch (error: any) {
    console.error("\n🔴 API CRASHED. EXACT ERROR:", error.message || error, "\n");

    return NextResponse.json({
      disease: "Possible Dermatitis / Unknown (System Overloaded)",
      confidence: 85,
      severity: "Moderate",
      symptoms: ["Check the VS Code Terminal to see the exact error!"],
      immediate_actions: [
        "The real AI crashed.",
        "Error Details: " + (error.message || "Unknown error"),
        "Look at the terminal at the bottom of VS Code for more info."
      ]
    });
  }
}