"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="el">
      <body>
        <h1>Something went wrong</h1>
        <p>Please try again later.</p>
      </body>
    </html>
  );
}
