FROM nginx:alpine

# Install necessary packages
RUN apk add --no-cache bash

# Copy Nginx configurations
COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./hosts/live.conf /etc/nginx/conf.d/hosts/live.conf

# Expose port 80
EXPOSE 80
