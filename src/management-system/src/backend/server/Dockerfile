# Dockerfile to create an image for the PROCEED MS Server
#
# published under proceed/ms-server:latest
#
# steps to build and deploy:
# docker image build -t proceed/ms-server:latest build/management-system/server/
# docker login --username proceed --password YYY
# docker push proceed/ms-server:latest
#
# testing: docker container run -it --rm -p 443:33080 -p 33081:33081 --cap-add=SYS_ADMIN -v proceed-ms-server-storage-processes:/opt/proceed-ms-server/Processes -v proceed-ms-server-storage-databases:/opt/proceed-ms-server/Storage -v proceed-ms-server-storage-engine:/opt/proceed-ms-server/Engine -v proceed-ms-server-storage-config:/opt/proceed-ms-server/Config --name ms-server proceed/ms-server:latest
#
#
# production: docker container run --detach --restart unless-stopped -p 80:80 443:33080 -p 33081:33081 --cap-add=SYS_ADMIN -v $PWD/proceed-ssl:/opt/proceed-ms-server/ssl -v proceed-ms-server-storage-processes:/opt/proceed-ms-server/Processes -v proceed-ms-server-storage-databases:/opt/proceed-ms-server/Storage -v proceed-ms-server-storage-engine:/opt/proceed-ms-server/Engine -v proceed-ms-server-storage-config:/opt/proceed-ms-server/Config --name ms-server proceed/ms-server:latest
#
#  -v to docker image folder '<local-host-folder-absolute-path>:/opt/proceed-ms-server/ssl': optional, you can mount your own certificates ("certificate.pem", "private-key.key"), strongly recommended in production
#  -v 'proceed-ms-server-storage-processes': volume to backup the process data
#  -v 'proceed-ms-server-storage-databases': volume to backup the db data
#  -v 'proceed-ms-server-storage-engine': volume to backup the internal engine data (few data, because silent mode)
#  -v 'proceed-ms-server-storage-config:/opt/proceed-ms-server/Config': volume to backup the configuration of the server
#  --cap-add=SYS_ADMIN: needed because the server is started as user 'proceed'
#  -p 443:33080 -p 33081:33081: with this network setting, the server is not able to detect PROCEED Engines in the network
#  --network host (only linux): the server is able to detect PROCEED Engines in the network -> https is 33080
#


# :lts recommended over :lts-slim https://hub.docker.com/_/node?tab=description&page=1&ordering=last_updated&name=lts
FROM node:lts

# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 libxtst6 libxcb-dri3-0 libx11-xcb1 libxcb1 \
# Apparently it can happen, that some necessary deps are installed with google-chrome-stable 
# Here is a list of all deps for Puppeteer/Chromium: 
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix
    && rm -rf /var/lib/apt/lists/*



# Chrome can leave many zombie processes, so it is recommended to use --init for docker run or dumb-init
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#tips
# https://github.com/Yelp/dumb-init#option-4-downloading-the-binary-directly
RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.4/dumb-init_1.2.4_x86_64\
    && chmod +x /usr/local/bin/dumb-init


WORKDIR /opt/proceed-ms-server
# Copy complete build folder into docker image
COPY . .

RUN npm install \
    # Add user so we don't need --no-sandbox for Chrome/Puppeteer.
    # same layer as npm install to keep re-chowned files from using up several hundred MBs more space
    && groupadd -r proceed && useradd -r -g proceed -G audio,video proceed \
    # prepare storage locations, so VOLUME does not create the folders with root permissions 
    && mkdir -p ./Storage \
    && mkdir -p ./ssl \
    && mkdir -p ./Processes \
    && mkdir -p ./Config \
    && mkdir -p ./Engine \
    # create home dir for machine-uuid which creates a file ~/.nodemid
    && mkdir -p /home/proceed \
    && chown -R proceed:proceed /home/proceed \
    && chown -R proceed:proceed /opt/proceed-ms-server

# Install the new MS (nextJS App)
WORKDIR /opt/proceed-ms-server/management-system-v2
RUN yarn install
RUN yarn build

ENV NODE_ENV production

WORKDIR /opt/proceed-ms-server

# You should not use VOLUME keyword in a Dockerfile: https://stackoverflow.com/questions/49620300/what-is-the-purpose-of-dockerfile-command-volume
# VOLUME [ "/opt/proceed-ms-server/..." ]

# Run everything after as non-privileged user.
USER proceed

EXPOSE 3000

# Documentation of Ports:
# Web (HTTP) and Let's encrypt client (it needs to host a file for identification)
EXPOSE 80
# WEB and REST (HTTPS)
EXPOSE 33080
# WebSocket
EXPOSE 33081
# Puppeteer, don't need to be exposed - enable only for testing
# EXPOSE 33082
# Engine, don't need to be exposed
# EXPOSE 33029


# Chrome can leave many zombie processes, so it is recommended to use --init for docker run or dumb-init
ENTRYPOINT [ "/usr/local/bin/dumb-init", "--", "node", "server.js" ]
