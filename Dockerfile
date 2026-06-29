# Single-image build for any container host (Fly.io, Railway, Cloud Run, etc.).
FROM node:20-slim AS build
WORKDIR /app
COPY . .
RUN npm --prefix server install --omit=dev \
 && npm --prefix client install --include=dev \
 && npm --prefix client run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_SOURCE=sim
# Copy server (with installed deps) and the built client.
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/package.json ./package.json
# Hosts inject PORT; the server reads process.env.PORT (defaults to 4000).
EXPOSE 4000
CMD ["node", "server/src/index.js"]
