FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY . /usr/share/caddy

# Caddy listens on $PORT (Railway injects it); fall back to 80 locally.
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
