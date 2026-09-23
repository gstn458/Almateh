# Radar has no npm dependencies, so the image is the runtime plus the source.
FROM node:22-alpine

WORKDIR /app
COPY . .

# The catalogue seed ships in the image; the live database lives on a mounted
# volume so it survives deploys and restarts.
ENV RADAR_DB=/data/radar.db
ENV PORT=8080
EXPOSE 8080

# Rebuild the site at image build time so public/ always matches pages/.
RUN node scripts/build-site.mjs

CMD ["node", "server/index.js"]
