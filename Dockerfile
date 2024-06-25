FROM node:18-alpine
WORKDIR /usr/app
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 4000
CMD ["npm", "start"]