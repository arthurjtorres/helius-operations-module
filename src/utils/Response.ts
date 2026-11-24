type SuccessResponse<T> = {
  status: number;
  message: string;
  data?: T;
};

type ErrorResponse = {
  status: number;
  message: string;
};

type StandardResponse<T = undefined> = SuccessResponse<T> | ErrorResponse;

class Response {
  static ok<T>(message: string, data?: T): SuccessResponse<T> {
    return { status: 200, message, data };
  }

  static created<T>(message: string, data?: T): SuccessResponse<T> {
    return { status: 201, message, data };
  }

  static noContent(message: string): SuccessResponse<null> {
    return { status: 204, message, data: null };
  }

  static badRequest(message: string): ErrorResponse {
    return { status: 400, message };
  }

  static unauthorized(message: string = "Acesso não autorizado!"): ErrorResponse {
    return { status: 401, message };
  }

  static forbidden(message: string): ErrorResponse {
    return { status: 403, message }
  }

  static tooManyRequests(message: string = "Muitas requisições. Tente novamente mais tarde."): ErrorResponse {
    return { status: 429, message };
  }

  static notFound(message: string): ErrorResponse {
    return { status: 404, message };
  }

  /** @param data Opcional: dados para o cliente resolver o conflito (ex.: id do registro inativo). */
  static conflict<T>(message: string, data?: T): ErrorResponse & { data?: T } {
    return data === undefined ? { status: 409, message } : { status: 409, message, data };
  }

  static unprocessableEntity(message: string): ErrorResponse {
    return { status: 422, message };
  }

  static internalError(message: string = "Erro interno do servidor"): ErrorResponse {
    return { status: 500, message };
  }
}

export type { StandardResponse };
export default Response;