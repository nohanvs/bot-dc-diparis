import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
  ChatInputCommandInteraction,
  ActivityType,
} from "discord.js";
import * as setupCommand from "./commands/setup.js";
import * as testarCommand from "./commands/testar.js";
import * as twitchCommand from "./commands/twitch.js";
import { getAllConfigs, updateStreamState } from "./config.js";
import { getStreamInfo } from "./twitch.js";
import { sendLiveNotification } from "./notifications.js";
import { startTwitchChat } from "./twitch-chat.js";

const POLL_INTERVAL_MS = 60_000;

interface Command {
  data: { name: string; toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export async function startBot(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token) throw new Error("DISCORD_TOKEN não está definido.");
  if (!clientId) throw new Error("DISCORD_CLIENT_ID não está definido.");
  if (!process.env.TWITCH_CLIENT_ID) throw new Error("TWITCH_CLIENT_ID não está definido.");
  if (!process.env.TWITCH_CLIENT_SECRET) throw new Error("TWITCH_CLIENT_SECRET não está definido.");

  const commands = new Collection<string, Command>();
  commands.set(setupCommand.data.name, setupCommand as Command);
  commands.set(testarCommand.data.name, testarCommand as Command);
  commands.set(twitchCommand.data.name, twitchCommand as Command);

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", async (readyClient) => {
    console.log(`✅ Bot conectado como ${readyClient.user.tag}`);

    readyClient.user.setPresence({
      status: "dnd",
      activities: [
        {
          name: "1 s",
          type: ActivityType.Watching,
        },
      ],
    });
    console.log("✅ Status definido: DND | 👀 dev novak9j");

    const rest = new REST().setToken(token);
    const commandBody = [setupCommand.data.toJSON(), testarCommand.data.toJSON(), twitchCommand.data.toJSON()];

    const guildId = process.env.DISCORD_GUILD_ID;

    try {
      if (guildId) {
        console.log("⏳ Limpando comandos globais e registrando no servidor...");
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commandBody,
        });
        console.log("✅ Slash commands registrados no servidor (sem duplicatas)!");
      } else {
        console.log("⏳ Registrando slash commands globalmente...");
        await rest.put(Routes.applicationCommands(clientId), {
          body: commandBody,
        });
        console.log("✅ Slash commands globais registrados com sucesso!");
      }
    } catch (err) {
      console.error("❌ Erro ao registrar commands:", err);
    }

    startPolling(client);
    startTwitchChat().catch((err) => console.error("❌ Erro ao conectar bot da Twitch:", err));
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Erro ao executar /${interaction.commandName}:`, err);
      const msg = { content: "❌ Ocorreu um erro ao executar este comando.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  });

  await client.login(token);
}

function startPolling(client: Client): void {
  console.log("🔄 Iniciando verificação de lives...");
  poll(client);
  setInterval(() => poll(client), POLL_INTERVAL_MS);
}

async function poll(client: Client): Promise<void> {
  const configs = getAllConfigs();
  if (configs.length === 0) return;

  const streamersChecked = new Set<string>();

  for (const config of configs) {
    if (!config.streamerName || !config.channelId) continue;

    const key = config.streamerName.toLowerCase();

    try {
      const stream = await getStreamInfo(config.streamerName);

      if (stream) {
        const alreadyNotified = config.isLive && config.lastStreamId === stream.id;
        if (!alreadyNotified) {
          console.log(`🔴 ${stream.userName} ficou ao vivo! Notificando guild ${config.guildId}...`);
          await sendLiveNotification(client, config, stream);
          updateStreamState(config.guildId, true, stream.id);
        }
      } else {
        if (config.isLive) {
          console.log(`⚫ ${config.streamerName} ficou offline na guild ${config.guildId}.`);
          updateStreamState(config.guildId, false, null);
        }
      }

      streamersChecked.add(key);
    } catch (err) {
      console.error(`Erro ao verificar streamer ${config.streamerName}:`, err);
    }
  }
}
