
FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install express@4

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
