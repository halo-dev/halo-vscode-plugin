export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Not found error";
  }
}
