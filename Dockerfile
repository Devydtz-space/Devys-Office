FROM oven/bun:1
WORKDIR /app
COPY index.ts ./index.ts
COPY desktop/renderer/office.js desktop/renderer/office-state.js desktop/renderer/office.css desktop/renderer/markdown.js ./desktop/renderer/
RUN mkdir -p /data
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "index.ts"]
