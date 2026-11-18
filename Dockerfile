FROM oven/bun:1
WORKDIR /app
COPY index.ts ./index.ts
RUN mkdir -p /data
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "index.ts"]
