# Serves Bauder Home from your Umbrel so the iPad can reach Home Assistant
# over plain http on your home network.
FROM nginx:1.27-alpine
COPY umbrel/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js sw.js manifest.webmanifest /usr/share/nginx/html/
COPY icons /usr/share/nginx/html/icons
RUN mkdir -p /usr/share/nginx/html/data
COPY umbrel/bauder-hq.sample.json /usr/share/nginx/html/data/bauder-hq.sample.json
EXPOSE 80
