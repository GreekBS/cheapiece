export type StructuredLogError = {
  message: string;
  code?: string;
  stack?: string;
};

export type StructuredLogErrorPayload = {
  domain: string;
  function: string;
  error: StructuredLogError;
  [key: string]: unknown;
};

/** Single-line JSON error logs for production drains (stdout). */
export const logger = {
  error(payload: StructuredLogErrorPayload): void {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      ...payload,
    });
    // eslint-disable-next-line no-console -- intentional structured logging sink
    console.error(line);
  },
};
