declare global {
  namespace Express {
    interface Request {
      /** Set by requireAdmin once the access-token cookie has been verified. */
      adminId?: string;
    }
  }
}

export {};
