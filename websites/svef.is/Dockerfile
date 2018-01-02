FROM node:8

WORKDIR /code

COPY ./ /code

RUN yarn install --pure-lockfile

WORKDIR /code/websites/svef.is

RUN yarn run build

EXPOSE 5000

CMD [ "yarn", "run", "serve" ]
