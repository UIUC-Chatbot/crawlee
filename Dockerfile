# Specify the base Docker image. You can read more about
# the available images at https://crawlee.dev/docs/guides/docker-images
# You can also use any other image from Docker Hub.
FROM apify/actor-node-playwright-chrome:20 AS builder

# Copy package files
COPY --chown=myuser package*.json ./

# Install all dependencies
RUN npm install --include=dev --audit=false

# Copy source files
COPY --chown=myuser . ./

# Build project
RUN npm run build

# Create final image
FROM apify/actor-node-playwright-chrome:20

# Copy built files
COPY --from=builder --chown=myuser /home/myuser/dist ./dist
COPY --chown=myuser package*.json ./

# Install dependencies and Playwright - combine all installations to reduce layers
USER root
RUN apt-get update && apt-get install -y \
    libwoff1 \
    libopus0 \
    libwebp7 \
    libwebpdemux2 \
    libenchant-2-2 \
    libgudev-1.0-0 \
    libsecret-1-0 \
    libhyphen0 \
    libgdk-pixbuf2.0-0 \
    libegl1 \
    libnotify4 \
    libxslt1.1 \
    libevent-2.1-7 \
    libgles2 \
    libvpx7 \
    libxcomposite1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libepoxy0 \
    libgtk-3-0 \
    libharfbuzz-icu0 \
    libgstreamer-gl1.0-0 \
    libgstreamer-plugins-bad1.0-0 \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    xvfb \
    wget \
    xauth \
    fonts-noto-color-emoji \
    libnss3 \
    libcups2 \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libxss1 \
    libxtst6 && \
    npm --quiet set progress=false && \
    npm install --omit=dev --omit=optional && \
    npx playwright install chromium && \
    npx playwright install-deps chromium

# Copy remaining files
COPY --chown=myuser . ./

# Switch back to non-root user for security
USER myuser

# Run the image
CMD ./start_xvfb_and_run_cmd.sh && npm run start:prod --silent