import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { sendMessage, reloadSchedule } from "../twitch-chat.js";
import { getTwitchMessages, addTwitchMessage, removeTwitchMessage } from "../twitch-messages.js";

const TWITCH_PURPLE = 0x9146ff;

export const data = new SlashCommandBuilder()
  .setName("twitch")
  .setDescription("Gerencia as mensagens automáticas no chat da Twitch")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("adicionar")
      .setDescription("Adiciona uma mensagem automática no chat da Twitch")
      .addStringOption((opt) =>
        opt.setName("mensagem").setDescription("Mensagem a enviar no chat").setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("intervalo")
          .setDescription("Intervalo em minutos entre cada envio")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(120)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remover")
      .setDescription("Remove uma mensagem automática pelo número")
      .addIntegerOption((opt) =>
        opt.setName("numero").setDescription("Número da mensagem (use /twitch listar para ver)").setRequired(true).setMinValue(1)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("listar").setDescription("Lista todas as mensagens automáticas configuradas")
  )
  .addSubcommand((sub) =>
    sub
      .setName("enviar")
      .setDescription("Envia uma mensagem agora no chat da Twitch")
      .addStringOption((opt) =>
        opt.setName("mensagem").setDescription("Mensagem a enviar agora").setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "adicionar") {
    const mensagem = interaction.options.getString("mensagem", true);
    const intervalo = interaction.options.getInteger("intervalo", true);

    addTwitchMessage(mensagem, intervalo);
    reloadSchedule();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(TWITCH_PURPLE)
          .setTitle("✅ Mensagem adicionada!")
          .setDescription(`A mensagem será enviada no chat a cada **${intervalo} minuto(s)**:\n\n> ${mensagem}`)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  if (sub === "remover") {
    const numero = interaction.options.getInteger("numero", true);
    const msgs = getTwitchMessages();

    if (numero > msgs.length) {
      await interaction.reply({
        content: `❌ Não existe mensagem número ${numero}. Use /twitch listar para ver as mensagens.`,
        ephemeral: true,
      });
      return;
    }

    const removed = msgs[numero - 1];
    removeTwitchMessage(numero - 1);
    reloadSchedule();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(TWITCH_PURPLE)
          .setTitle("✅ Mensagem removida!")
          .setDescription(`Removido: > ${removed.message}`)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  if (sub === "listar") {
    const msgs = getTwitchMessages();

    if (msgs.length === 0) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(TWITCH_PURPLE)
            .setTitle("📋 Mensagens automáticas")
            .setDescription("Nenhuma mensagem configurada. Use `/twitch adicionar` para adicionar.")
            .setTimestamp(),
        ],
        ephemeral: true,
      });
      return;
    }

    const lista = msgs
      .map((m, i) => `**${i + 1}.** A cada ${m.intervalMinutes}min → ${m.message}`)
      .join("\n");

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(TWITCH_PURPLE)
          .setTitle("📋 Mensagens automáticas da Twitch")
          .setDescription(lista)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  if (sub === "enviar") {
    const mensagem = interaction.options.getString("mensagem", true);
    await interaction.deferReply({ ephemeral: true });

    try {
      await sendMessage(mensagem);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(TWITCH_PURPLE)
            .setTitle("✅ Mensagem enviada!")
            .setDescription(`Enviado no chat da Twitch:\n\n> ${mensagem}`)
            .setTimestamp(),
        ],
      });
    } catch {
      await interaction.editReply({
        content: "❌ Erro ao enviar mensagem. O bot da Twitch está conectado?",
      });
    }
    return;
  }
}
