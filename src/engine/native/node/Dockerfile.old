# Dockerfile to create an image for the PROCEED Engine

# published under proceed/engine:latest

# steps to build and deploy:
# docker image build -t proceed/engine:latest build/engine/
# docker login --username proceed --password YYY
# docker push proceed/engine:latest

# test (only linux): docker container run -it --rm --network host --name engine proceed/engine:latest
#
# test (all): docker container run --publish 33029:33029 --detach --rm --name engine proceed/engine:latest
#
#  --network host: put the host network adapter to the docker container, works only on linux but is necessary to work properly (mDNS)
#  --publish 33029:33029: if this is used, mDNS for the Engine does not work properly, so the discovery is not working correctly
#
#


# :lts recommended over :lts-slim https://hub.docker.com/_/node?tab=description&page=1&ordering=last_updated&name=lts
FROM node:lts

WORKDIR /opt/proceed-engine
COPY proceed-engine.js .
COPY universal.js .
COPY injector.js .
COPY node_modules/ ./node_modules/

RUN groupadd -r proceed \
    && useradd -r -g proceed proceed \
    && mkdir -p /home/proceed/ \
    && chown -R proceed:proceed /home/proceed \
    && chown -R proceed:proceed /opt/proceed-engine

# Run everything after as non-privileged user.
USER proceed

EXPOSE 33029

CMD ["node", "proceed-engine.js"]
