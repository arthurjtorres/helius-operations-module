import { Sequelize } from "sequelize";
import config from "./config/DatabaseConfig";

const connection = new Sequelize(config);

connection.authenticate()
  .then(() => {
    console.log('✅ Conectado ao banco de dados com sucesso.');
  })
  .catch((error) => {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
  });

  export default connection;