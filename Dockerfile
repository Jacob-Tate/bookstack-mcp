FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production
EXPOSE 3000
CMD ["node", "dist/index.js"]
