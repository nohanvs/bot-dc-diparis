import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { getGuildConfig, setGuildConfig } from "../config.js";

const TWITCH_PURPLE = 0x9146ff;

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure o bot de notificações da Twitch neste servidor")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("canal")
      .setDescription("Define o canal onde as notificações de live serão enviadas")
      .addChannelOption((opt) =>
        opt
          .setName("canal")
          .setDescription("Canal de texto para as notificações")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("streamer")
      .setDescription("Define o nome do streamer na Twitch a ser monitorado")
      .addStringOption((opt) =>
        opt
          .setName("nome")
          .setDescription("Nome de usuário na Twitch (ex: dipariss7)")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("mencao")
      .setDescription("Define quem será mencionado quando o streamer entrar ao vivo")
      .addStringOption((opt) =>
        opt
          .setName("tipo")
          .setDescription("Quem mencionar")
          .setRequired(true)
          .addChoices(
            { name: "@everyone", value: "everyone" },
            { name: "Nenhum", value: "none" }
          )
      )
      .addRoleOption((opt) =>
        opt
          .setName("cargo")
          .setDescription("Cargo específico para mencionar (opcional)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("status").setDescription("Mostra a configuração atual do bot neste servidor")
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ Este comando só pode ser usado em servidores.", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "canal") {
    const channel = interaction.options.getChannel("canal", true);
    setGuildConfig(interaction.guildId, { channelId: channel.id });

    const embed = new EmbedBuilder()
      .setColor(TWITCH_PURPLE)
      .setTitle("✅ Canal configurado!")
      .setDescription(`As notificações de live serão enviadas em <#${channel.id}>`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "streamer") {
    const nome = interaction.options.getString("nome", true).toLowerCase().trim();
    setGuildConfig(interaction.guildId, { streamerName: nome, isLive: false, lastStreamId: null });

    const embed = new EmbedBuilder()
      .setColor(TWITCH_PURPLE)
      .setTitle("✅ Streamer configurado!")
      .setDescription(`Agora monitorando **${nome}** na Twitch 🟣`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "mencao") {
    const tipo = interaction.options.getString("tipo", true);
    const cargo = interaction.options.getRole("cargo");

    let mentionRole: string | null = null;
    let desc = "";

    if (cargo) {
      mentionRole = cargo.id;
      desc = `O cargo **${cargo.name}** será mencionado nas notificações.`;
    } else if (tipo === "everyone") {
      mentionRole = "everyone";
      desc = "**@everyone** será mencionado nas notificações.";
    } else {
      mentionRole = null;
      desc = "Nenhuma menção será feita nas notificações.";
    }

    setGuildConfig(interaction.guildId, { mentionRole });

    const embed = new EmbedBuilder()
      .setColor(TWITCH_PURPLE)
      .setTitle("✅ Menção configurada!")
      .setDescription(desc)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "status") {
    const config = getGuildConfig(interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(TWITCH_PURPLE)
      .setTitle("⚙️ Configuração do Bot")
      .setDescription("Aqui está a configuração atual deste servidor:")
      .addFields(
        {
          name: "📢 Canal de notificações",
          value: config?.channelId ? `<#${config.channelId}>` : "❌ Não configurado",
          inline: true,
        },
        {
          name: "🎮 Streamer",
          value: config?.streamerName ? `[${config.streamerName}](https://twitch.tv/${config.streamerName})` : "❌ Não configurado",
          inline: true,
        },
        {
          name: "📣 Menção",
          value: config?.mentionRole
            ? config.mentionRole === "everyone"
              ? "@everyone"
              : `<@&${config.mentionRole}>`
            : "Nenhuma",
          inline: true,
        },
        {
          name: "🔴 Status atual",
          value: config?.isLive ? "Ao vivo agora!" : "Offline",
          inline: true,
        }
      )
      .setFooter({ text: "Use /setup canal, /setup streamer e /setup mencao para configurar" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }
}
