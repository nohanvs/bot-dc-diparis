import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "guild-configs.json");

export interface GuildConfig {
  guildId: string;
  channelId: string;
  streamerName: string;
  mentionRole: string | null;
  lastStreamId: string | null;
  isLive: boolean;
}

type ConfigMap = Record<string, GuildConfig>;

function loadConfigs(): ConfigMap {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ConfigMap;
  } catch {
    return {};
  }
}

function saveConfigs(configs: ConfigMap): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(configs, null, 2), "utf-8");
}

export function getGuildConfig(guildId: string): GuildConfig | null {
  const configs = loadConfigs();
  return configs[guildId] ?? null;
}

export function setGuildConfig(guildId: string, data: Partial<GuildConfig>): GuildConfig {
  const configs = loadConfigs();
  const existing = configs[guildId] ?? {
    guildId,
    channelId: "",
    streamerName: "",
    mentionRole: null,
    lastStreamId: null,
    isLive: false,
  };
  const updated: GuildConfig = { ...existing, ...data, guildId };
  configs[guildId] = updated;
  saveConfigs(configs);
  return updated;
}

export function updateStreamState(guildId: string, isLive: boolean, streamId: string | null): void {
  const configs = loadConfigs();
  if (configs[guildId]) {
    configs[guildId].isLive = isLive;
    configs[guildId].lastStreamId = streamId;
    saveConfigs(configs);
  }
}

export function getAllConfigs(): GuildConfig[] {
  const configs = loadConfigs();
  return Object.values(configs).filter((c) => c.channelId && c.streamerName);
}
