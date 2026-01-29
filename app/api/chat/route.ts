import { NextResponse } from "next/server";

const DIFY_API_URL = process.env.DIFY_API_URL ?? "https://api.dify.ai/v1";

export async function POST(request: Request) {
  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Missing DIFY_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const bodyJson = await request.json();
    const payload = {
      inputs: {
        level: bodyJson?.level ?? "LV1_初识 (让他对你产生好奇)",
        persona: bodyJson?.persona ?? "霸总",
      },
      query: bodyJson?.query || "你好",
      response_mode: "blocking",
      conversation_id: bodyJson?.conversation_id || "",
      user: bodyJson?.user ?? "user-123",
    };

    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        "❌ Dify API 报错详情:",
        JSON.stringify(errorData, null, 2)
      );
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to connect to Dify." },
      { status: 500 }
    );
  }
}
