import { Sequelize } from "sequelize";
import config from "./config/DatabaseConfig";
import { logError } from "../utils/logError";

const connection = new Sequelize(config);

connection.authenticate()
  .then(() => {
    console.log('✅ Conectado ao banco de dados com sucesso.');
  })
  .catch((error) => {
    logError('Erro ao conectar ao banco de dados', error);
  });

  export default connection;