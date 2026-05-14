export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly code?: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}
