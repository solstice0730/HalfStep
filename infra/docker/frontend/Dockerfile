# syntax=docker/dockerfile:1.7

FROM node:22-alpine

WORKDIR /app

COPY frontend ./frontend

WORKDIR /app/frontend

RUN --mount=type=cache,target=/root/.npm \
    if [ -f package.json ]; then npm install --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000; fi

EXPOSE 8081

CMD ["sh", "-c", "if [ -f package.json ]; then npm run web -- --host lan; else echo 'frontend/package.json not found. Initialize React Native project first.'; tail -f /dev/null; fi"]
