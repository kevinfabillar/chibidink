# ChibiDink: one image with the API and the website (served by the API from wwwroot).
# Works on ARM (Oracle Ampere) and Intel/AMD servers.

# ---- 1. Build the website ----
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN npm run build

# ---- 2. Build the API ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY server/ ./
RUN dotnet publish src/ChibiDink.Api -c Release -o /out

# ---- 3. Run ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /out ./
COPY --from=web /web/dist ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "ChibiDink.Api.dll"]
