import { startBot } from "./bot.js";

console.log("🚀 Iniciando Discord Bot...");

startBot().catch((err) => {
  console.error("❌ Falha fatal ao iniciar o bot:", err);
  process.exit(1);
});
