const DEFAULT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzWmbEiaNRx4J-s9YaLlkwcW9NcltHI76tVUZ8kxwhfNa-BbBizToxb6TNEa7_Z0gmO/exec";

type SheetsAction =
  | "getAllData"
  | "getUsers"
  | "upsertUser"
  | "upsertSantri"
  | "upsertIbadah"
  | "upsertPembinaan";

interface SheetsProxyBody {
  action: SheetsAction;
  payload?: unknown;
}

function getEnvValue(key: string): string {
  const env = globalThis.process?.env as Record<string, string | undefined> | undefined;
  return env?.[key]?.trim() ?? "";
}

function getSheetsConfig() {
  return {
    webhookUrl: getEnvValue("GOOGLE_SHEETS_WEBHOOK_URL") || DEFAULT_WEBHOOK_URL,
    token: getEnvValue("GOOGLE_SHEETS_WEBHOOK_TOKEN"),
  };
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

async function parseProxyBody(request: Request): Promise<SheetsProxyBody> {
  const body = (await request.json()) as Partial<SheetsProxyBody>;

  if (!body.action) {
    throw new Error("Action wajib diisi.");
  }

  return {
    action: body.action,
    payload: body.payload ?? {},
  };
}

async function callSheetsWebhook(body: SheetsProxyBody) {
  const { webhookUrl, token } = getSheetsConfig();

  if (!token) {
    return {
      ok: false as const,
      configured: false as const,
      message:
        "GOOGLE_SHEETS_WEBHOOK_TOKEN belum diset. Sinkronisasi Google Sheets masih dimatikan.",
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token,
      action: body.action,
      payload: body.payload ?? {},
    }),
  });

  const rawText = await response.text();
  let parsed: unknown = null;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = {
      success: false,
      message: "Webhook mengembalikan respons non-JSON.",
      rawText,
    };
  }

  return {
    ok: response.ok,
    configured: true as const,
    status: response.status,
    data: parsed,
  };
}

export async function handleSheetsProxyRequest(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const result = await callSheetsWebhook({
      action: "getAllData",
      payload: {},
    });

    if (!result.configured) {
      return jsonResponse({
        success: false,
        configured: false,
        message: result.message,
        data: null,
      });
    }

    return jsonResponse(result.data, { status: result.ok ? 200 : result.status });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { success: false, message: "Method tidak didukung." },
      { status: 405, headers: { allow: "GET, POST" } },
    );
  }

  try {
    const body = await parseProxyBody(request);
    const result = await callSheetsWebhook(body);

    if (!result.configured) {
      return jsonResponse({
        success: false,
        configured: false,
        message: result.message,
        data: null,
      });
    }

    return jsonResponse(result.data, { status: result.ok ? 200 : result.status });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        message: error instanceof Error ? error.message : "Request tidak valid.",
      },
      { status: 400 },
    );
  }
}
