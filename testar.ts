import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getGuildConfig } from "../config.js";
import { getStreamInfo } from "../twitch.js";
import { sendLiveNotification } from "../notifications.js";

const TWITCH_PURPLE = 0x9146ff;

export const data = new SlashCommandBuilder()
  .setName("testar")
  .setDescription("Testa a notificação de live — envia o aviso agora independente do estado")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ Este comando só pode ser usado em servidores.", ephemeral: true });
    return;
  }

  const config = getGuildConfig(interaction.guildId);

  if (!config?.channelId || !config?.streamerName) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle("❌ Bot não configurado")
          .setDescription("Use `/setup canal` e `/setup streamer` antes de testar.")
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const stream = await getStreamInfo(config.streamerName).catch(() => null);

  if (!stream) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x888888)
          .setTitle("⚫ Streamer offline")
          .setDescription(
            `**${config.streamerName}** não está ao vivo no momento.\n\nQuando a live começar, a notificação será enviada automaticamente em <#${config.channelId}>.`
          )
          .setTimestamp(),
      ],
    });
    return;
  }

  await sendLiveNotification(interaction.client, config, stream);

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(TWITCH_PURPLE)
        .setTitle("✅ Notificação enviada!")
        .setDescription(
          `A notificação de live do **${stream.userName}** foi enviada em <#${config.channelId}>.\n\n🔴 **${stream.viewerCount.toLocaleString("pt-BR")}** espectadores assistindo agora.`
        )
        .setTimestamp(),
    ],
  });
}
