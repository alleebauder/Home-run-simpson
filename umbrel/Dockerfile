# Serves Bauder Home from your Umbrel so the iPad can reach Home Assistant
# over plain http on your home network.
FROM nginx:1.27-alpine
COPY umbrel/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js household.js sw.js manifest.webmanifest household.json /usr/share/nginx/html/
COPY icons /usr/share/nginx/html/icons
COPY feed /usr/share/nginx/html/feed
RUN mkdir -p /usr/share/nginx/html/data
COPY umbrel/bauder-hq.sample.json /usr/share/nginx/html/data/bauder-hq.sample.json
EXPOSE 80
