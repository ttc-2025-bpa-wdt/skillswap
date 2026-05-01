FROM nginx:stable-alpine

# Install necessary packages
RUN apk add --no-cache bash

# Copy Nginx configurations
COPY ./ingress/nginx.conf /etc/nginx/nginx.conf
COPY ./ingress/skillswap.conf /etc/nginx/conf.d/hosts/skillswap.conf.template

# Run envsubst to finalize config
RUN cd /etc/nginx/conf.d/hosts && \
    envsubst < skillswap.conf.template > skillswap.conf && rm skillswap.conf.template

# Expose port 80
EXPOSE 80
