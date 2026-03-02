import app from "./app";
import "dotenv/config";
import './database/connection';

const PORT = +(process.env.PORT_API_OPERACIONAL || 3040);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend acessível em todas as interfaces na porta ${PORT}`);
});
