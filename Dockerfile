# ----------------------------------------------------
# Stage 1: Build the React frontend with Vite & Tailwind
# ----------------------------------------------------
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend


COPY frontend/package*.json ./

RUN npm install


COPY frontend/ ./

RUN npm run build


# ----------------------------------------------------
# Stage 2: Setup the production Node.js Express server
# ----------------------------------------------------
FROM node:20-slim
WORKDIR /app


COPY backend/package*.json ./backend/
WORKDIR /app/backend

RUN npm install --omit=dev

COPY backend/ ./

# Copy the built frontend static files from Stage 1 into the final image
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist


EXPOSE 5000


ENV NODE_ENV=production


CMD ["node", "server.js"]
