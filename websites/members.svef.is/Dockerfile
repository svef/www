FROM node:8

COPY ./yarn.lock ./package.json /code/
COPY ./components/package.json /code/components/
COPY ./styles/package.json /code/styles/
COPY ./websites/svef.is/package.json /code/websites/svef.is/

WORKDIR /code
RUN yarn install --pure-lockfile --no-cache

COPY ./ /code

WORKDIR /code/websites/svef.is

RUN yarn run build

EXPOSE 5000

CMD [ "yarn", "run", "serve" ]
