import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureSeed } from "./lib/ensureSeed.js";

app.listen(env.port, async () => {
  console.log(`🚀 API rodando em http://localhost:${env.port}`);
  // Garante os dados iniciais (admin + tipos). Não derruba a API se falhar.
  try {
    await ensureSeed();
  } catch (err) {
    console.error("Falha ao garantir dados iniciais:", err);
  }
});
