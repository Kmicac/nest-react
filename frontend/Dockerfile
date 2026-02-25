FROM node:18-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN yarn build

# -----
    
FROM nginx:alpine

COPY --from=build /app/build/ /var/www
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
