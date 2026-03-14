import tmi from "tmi.js";
import { getTwitchMessages } from "./twitch-messages.js";

const CHANNEL = process.env.TWITCH_CHANNEL ?? "dipariss7";
const USERNAME = process.env.TWITCH_BOT_USERNAME!;
const OAUTH_TOKEN = process.env.TWITCH_OAUTH_TOKEN!;

const RECONNECT_DELAYS_MS = [5_000, 10_000, 30_000, 60_000];

let client: tmi.Client | null = null;
let intervalHandles: ReturnType<typeof setInterval>[] = [];
let reconnecting = false;
let reconnectAttempt = 0;

export async function startTwitchChat(): Promise<void> {
  if (!USERNAME || !OAUTH_TOKEN) {
    console.warn("⚠️ TWITCH_BOT_USERNAME ou TWITCH_OAUTH_TOKEN não definidos — bot da Twitch desativado.");
    return;
  }

  await connect();
}

async function connect(): Promise<void> {
  if (client) {
    try { await client.disconnect(); } catch {}
    client = null;
  }

  client = new tmi.Client({
    options: { debug: false },
    identity: { username: USERNAME, password: OAUTH_TOKEN },
    channels: [CHANNEL],
  });

  client.on("connected", () => {
    console.log(`✅ [Twitch] Conectado no canal #${CHANNEL}`);
    reconnectAttempt = 0;
    reconnecting = false;
    reloadSchedule();
  });

  client.on("disconnected", (reason) => {
    console.warn(`⚠️ [Twitch] Desconectado: ${reason}`);
    clearAllIntervals();
    scheduleReconnect();
  });

  try {
    await client.connect();
  } catch (err) {
    console.error("❌ [Twitch] Falha ao conectar:", err);
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (reconnecting) return;
  reconnecting = true;

  const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
  reconnectAttempt++;

  console.log(`🔄 [Twitch] Reconectando em ${delay / 1000}s... (tentativa ${reconnectAttempt})`);

  setTimeout(async () => {
    reconnecting = false;
    await connect();
  }, delay);
}

export function reloadSchedule(): void {
  clearAllIntervals();

  if (!client) {
    console.warn("⚠️ reloadSchedule chamado mas o bot não está conectado.");
    return;
  }

  const messages = getTwitchMessages();

  if (messages.length === 0) {
    console.log("ℹ️ [Twitch] Nenhuma mensagem automática configurada.");
    return;
  }

  for (const msg of messages) {
    const ms = msg.intervalMinutes * 60 * 1000;

    const handle = setInterval(async () => {
      try {
        await client?.say(CHANNEL, msg.message);
        console.log(`💬 [Twitch] Enviado: ${msg.message}`);
      } catch (err) {
        console.error("❌ [Twitch] Erro ao enviar mensagem:", err);
      }
    }, ms);

    intervalHandles.push(handle);
    console.log(`⏱️ [Twitch] Agendado a cada ${msg.intervalMinutes}min: "${msg.message}"`);
  }
}

function clearAllIntervals(): void {
  for (const h of intervalHandles) clearInterval(h);
  intervalHandles = [];
}

export async function sendMessage(message: string): Promise<void> {
  if (!client) {
    console.warn("⚠️ Bot da Twitch não está conectado.");
    return;
  }
  await client.say(CHANNEL, message);
}

export function getTwitchClient(): tmi.Client | null {
  return client;
}
