import {
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from "discord.js";
import { StreamInfo } from "./twitch.js";
import { GuildConfig } from "./config.js";

const TWITCH_PURPLE = 0x9146ff;

export async function sendLiveNotification(
  client: Client,
  config: GuildConfig,
  stream: StreamInfo
): Promise<void> {
  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (!channel || !(channel instanceof TextChannel)) return;

  const twitchUrl = `https://www.twitch.tv/${stream.userLogin}`;

  const embed = new EmbedBuilder()
    .setColor(TWITCH_PURPLE)
    .setAuthor({
      name: `${stream.userName} está ao vivo na Twitch!`,
      iconURL: stream.profileImageUrl,
      url: twitchUrl,
    })
    .setTitle(stream.title)
    .setURL(twitchUrl)
    .addFields(
      {
        name: "Jogo",
        value: stream.gameName || "Desconhecido",
        inline: true,
      },
      {
        name: "Espectadores",
        value: stream.viewerCount.toLocaleString("pt-BR"),
        inline: true,
      }
    )
    .setImage(stream.thumbnailUrl + `?r=${Date.now()}`)
    .setFooter({
      text: "Twitch • Live agora",
      iconURL:
        "https://assets.help.twitch.tv/Glitch_Purple_RGB.png",
    })
    .setTimestamp(new Date(stream.startedAt));

  const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Assistir Stream")
      .setStyle(ButtonStyle.Link)
      .setURL(twitchUrl)
      .setEmoji("🔴")
  );

  let content = "";
  if (config.mentionRole) {
    if (config.mentionRole === "everyone") {
      content = "@everyone";
    } else {
      content = `<@&${config.mentionRole}>`;
    }
  }

  await channel.send({
    content: content || undefined,
    embeds: [embed],
    components: [button],
  });
}
