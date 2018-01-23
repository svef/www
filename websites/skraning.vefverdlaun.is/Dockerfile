FROM node:8

COPY ./yarn.lock ./package.json /code/
COPY ./components/package.json /code/components/
COPY ./styles/package.json /code/styles/
COPY ./websites/skraning.vefverdlaun.is/package.json /code/websites/skraning.vefverdlaun.is/

WORKDIR /code
RUN yarn install --pure-lockfile --no-cache

COPY ./ /code

WORKDIR /code/websites/skraning.vefverdlaun.is

ARG MONGODB_URI=default_value
ENV MONGODB_URI=$MONGODB_URI

RUN yarn run build

EXPOSE 5000

CMD [ "yarn", "run", "serve" ]
