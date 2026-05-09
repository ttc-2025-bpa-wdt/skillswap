#!/bin/sh
set -e

# Substitute HOSTNAME in the nginx config template
envsubst '${HOSTNAME}' < /etc/nginx/conf.d/hosts/skillswap.conf.template > /etc/nginx/conf.d/hosts/skillswap.conf
rm -f /etc/nginx/conf.d/hosts/skillswap.conf.template

exec nginx -g 'daemon off;'