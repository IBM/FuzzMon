FROM node:8.14

WORKDIR /usr/src/fuzzer

COPY package*.json ./

RUN npm install

COPY . . 

CMD ["source", "./setup_env.sh"]

#EXPOSE 3000

CMD ["npm", "test"]
