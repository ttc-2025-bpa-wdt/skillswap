FROM debian:latest

# Install necessary packages
RUN apt-get update && apt-get install -y \
    sudo locales curl unzip git nano \
    && rm -rf /var/lib/apt/lists/*

# Set default environment variables
ENV NODE_ENV=development

# Create a non-root user with root privileges
RUN useradd -m runner -s /bin/bash && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
USER runner

# Update locales and force US english
RUN echo "en_US.UTF-8 UTF-8" | sudo tee /etc/locale.gen > /dev/null && sudo locale-gen && \
    sudo localedef -i en_US -f UTF-8 en_US.UTF-8

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Set working directory and entrypoint
WORKDIR /workspace
ENTRYPOINT [ "/bin/bash", "/workspace/.devcontainer/init.sh" ]
