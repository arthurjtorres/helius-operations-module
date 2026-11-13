import "dotenv/config";
import { Options } from "sequelize";


const config: Options = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,  // Já compartilhado no .env
  host: process.env.DB_HOST,
  dialect: 'postgres',
  // Em produção não registra SQL (a query traz valores); fora dela, mantém o log no console
  logging: process.env.NODE_ENV === 'production' ? false : console.log,
}
export = config