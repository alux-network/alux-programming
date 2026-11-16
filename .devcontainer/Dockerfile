# Development image for VS Code Dev Containers: everything development and extended browser tests need.
# Tool versions match .github/workflows/deploy.yml; change both together.

# mdBook and its preprocessors, built once; only the binaries reach the final image.
FROM rust:1-bookworm AS mdbook
RUN cargo install mdbook --version 0.4.52 --locked \
 && cargo install mdbook-admonish --version 1.20.0 --locked \
 && cargo install mdbook-katex --version 0.9.4 --locked \
 && cargo install mdbook-linkcheck --version 0.7.7 --locked

FROM node:24-bookworm
COPY --from=mdbook /usr/local/cargo/bin/mdbook* /usr/local/bin/
# The browser tests need all three engines at the version package.json pins, with their system
# libraries; a shared path keeps them outside the workspace and the user's home.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@1.62.1 install --with-deps chromium firefox webkit \
 && chmod -R a+rX /ms-playwright
# The node_modules volume mounts owned by root; postCreateCommand hands it to the node user.
RUN apt-get update && apt-get install -y --no-install-recommends sudo \
 && echo 'node ALL=(root) NOPASSWD:ALL' > /etc/sudoers.d/node && rm -rf /var/lib/apt/lists/*
