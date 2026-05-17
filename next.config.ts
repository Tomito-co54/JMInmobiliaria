import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  // Org/project read from SENTRY_ORG and SENTRY_PROJECT at build time (set on Vercel)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Auth token uploads source maps so stack traces deminify in Sentry.
  // Optional — without it, errors are still captured but stack traces show transpiled code.
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
