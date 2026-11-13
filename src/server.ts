import app from "./app";
import "dotenv/config";
import './database/connection';
import { assertJwtSecret } from './middlewares/Authentication';
import { assertRequiredEnv } from './utils/assertRequiredEnv';

// Falha ao subir se faltar variável obrigatória (lista só os nomes) ou se JWT_SECRET estiver vazio
assertRequiredEnv();
assertJwtSecret();

const PORT = +(process.env.PORT_API_OPERACIONAL || 3040);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend acessível em todas as interfaces na porta ${PORT}`);
});
