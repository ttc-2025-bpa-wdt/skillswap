FROM nginx:stable-alpine

# Install necessary packages
RUN apk add --no-cache bash

# Copy Nginx configurations
COPY ./ingress/nginx.conf /etc/nginx/nginx.conf
COPY ./ingress/skillswap.conf /etc/nginx/conf.d/hosts/skillswap.conf.template

# Run envsubst at startup to substitute runtime env vars
# Use a custom entrypoint that processes the template before starting nginx
COPY ./ingress/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]