import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_FILE = path.join(__dirname, "..", "data", "twitch-messages.json");

export interface TwitchMessage {
  message: string;
  intervalMinutes: number;
}

function load(): TwitchMessage[] {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) return [];
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8")) as TwitchMessage[];
  } catch {
    return [];
  }
}

function save(msgs: TwitchMessage[]): void {
  const dir = path.dirname(MESSAGES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(msgs, null, 2), "utf-8");
}

export function getTwitchMessages(): TwitchMessage[] {
  return load();
}

export function addTwitchMessage(message: string, intervalMinutes: number): void {
  const msgs = load();
  msgs.push({ message, intervalMinutes });
  save(msgs);
}

export function removeTwitchMessage(index: number): void {
  const msgs = load();
  msgs.splice(index, 1);
  save(msgs);
}

export function saveTwitchMessages(msgs: TwitchMessage[]): void {
  save(msgs);
}
