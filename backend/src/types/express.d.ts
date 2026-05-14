export {};

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; walletAddress: string };
    }
  }
}
