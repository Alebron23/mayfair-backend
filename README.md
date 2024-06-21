# mayfair-backend
This repo serves as the backend of the Mayfair Motors web application. It is a Node.js application with a mongodb database. Mongose is the database client used to interact with mongodb to store and retrieve vehicle information, as well as vehicle images. The repo contains a dockerfile to generate a docker container for the applicaiton to run in. The docker container is deployed to Amazon ECS for accessibility of the frontend client through the internet. 

Frontend [repo](https://github.com/Alebron23/mayfair-webapp).
