import axios from "axios";

export const axiosRegistry = axios.create({
  baseURL: `http://modulo-cadastro:${process.env.PORT_API_CADASTRO}`,
  timeout: 5000,
});

export const axiosControl = axios.create({
  baseURL: `http://modulo-controle:${process.env.PORT_API_CONTROLE}`,
  timeout: 5000,
});