FROM debian:stable

RUN apt-get update && apt-get install -y curl gpg

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg |  apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update && apt-get install -y curl xvfb chromium wget yarn

COPY config/pin_nodesource /etc/apt/preferences.d/nodesource

RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt-get install -y ./google-chrome-stable_current_amd64.deb

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash - \
    && apt-get install -y nodejs gpg \
    && rm -rf /var/lib/apt/lists

WORKDIR /usr/src/app

ADD config/xvfb-chromium /usr/bin/xvfb-chromium
ADD config/xvfb-chrome /usr/bin/xvfb-chrome
RUN ln -s /usr/bin/xvfb-chrome /usr/bin/chrome-browser
RUN ln -s /usr/bin/xvfb-chromium /usr/bin/chromium-browser

COPY package.json /usr/src/app

COPY yarn.lock /usr/src/app

RUN yarn install

RUN rm -rf ~/.cache

CMD yarn start

