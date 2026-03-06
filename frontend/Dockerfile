FROM node:20-alpine

WORKDIR /app

# deps first (cached)
COPY package*.json ./
RUN npm ci

# app code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
