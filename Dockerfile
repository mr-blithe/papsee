FROM node:24-alpine AS base
RUN npm install --global pnpm@11.8.0
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so changing one in .env
# means rebuilding the image rather than restarting the container.
ARG NEXT_PUBLIC_SOURCE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_POSTHOG_ENABLED
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_POSTHOG_UI_HOST
# Scoped to this command so the placeholder is not recorded in the image; the real secret is read
# from the environment at runtime.
RUN BETTER_AUTH_SECRET=build-only-secret-at-least-32-characters pnpm build

# Drizzle Kit and tsx are devDependencies, so migrating and seeding happen from the build stage
# rather than from the runtime image, which carries neither.
FROM build AS migrate
CMD ["sh", "-c", "pnpm db:migrate && pnpm db:seed-contracts"]

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
