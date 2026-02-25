FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

# -------

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json yarn.lock ormconfig.js ./
RUN yarn install --production --frozen-lockfile

COPY --from=build /app/dist ./dist

EXPOSE 5000

CMD ["yarn", "start:prod"]