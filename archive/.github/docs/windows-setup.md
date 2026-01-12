# Windows Setup

If you attempt to use the development container using Docker Engine on Windows, it will not function correctly due to
filesystem conflicts.This guide provides instructions for setting up a Linux development environment on a Windows
host.

<p align="center">
    <img src="../assets/dev-server-graph.drawio.svg" /><br>
    <i>Full Development Environment Setup Graph</i>
</p>


## Recommended: Set up a Virtual Machine for Linux

| Advantages                                           | Disadvantages                          |
|------------------------------------------------------|----------------------------------------|
| Full Linux development environment                   | Requires more system resources         |
| No Docker filesystem conflicts                       | Slightly more complex setup process    |
| Better compatibility with development containers     |                                        |

The recommended approach is to use a virtual machine on your Windows host. You can use software like VMWare Workstation
Pro or Hyper-V to create a virtual machine. From there, you can follow [Quick Start](../quick-start.md) to set up the
development container within the Linux VM.

You can also install Visual Studio Code on your Windows host and set up a development tunnel using the
`Remote - Tunnels` extension. This allows you to connect to the development container running inside the Linux VM from
your Windows host.

## Alternative: Use Windows Subsystem for Linux

| Advantages                                           | Disadvantages                               |
|------------------------------------------------------|---------------------------------------------|
| Lightweight alternative to a full virtual machine    | Terrible support for development containers |
| Easier to set up compared to a virtual machine       | Filesystem must be carefully managed        |

Windows Subsystem for Linux 2 (WSL2) is another option for running a Linux environment on Windows. Visual Studio Code
has terrible support for development containers under WSL2, so this approach may or may nor work well for you. Continue
following these steps to set up WSL2 and the development container:

1. Install WSL2 by following the instructions in the [Microsoft WSL2 Installation Guide](https://docs.microsoft.com/en-us/windows/wsl/install).
   We recommend Debian or a derivative distribution like Ubuntu.

2. Open Visual Studio Code and install the `Remote - WSL` extension from the Extensions Marketplace if you haven't
   already.

3. Open the command palette using `Ctrl+Shift+P`, type "Connect WSL", and select `WSL: Connect to WSL`. This will
   install Visual Studio Code server in your WSL2 environment and connect your open window to WSL2.

4. Install `git` and `docker` in your WSL2 environment. You can install Git using your distribution's package manager. For
   Docker, follow the instructions in the [Docker Installation Guide for Linux](https://docs.docker.com/engine/install/).

5. Ensure that the Docker daemon is running in your WSL2 environment. You may need to start the Docker service manually
   using a command like `sudo systemctl enable --now docker`, depending on your distribution.

> [!CAUTION]
> WSL2 supports accessing the Windows filesystem through `/mnt/c/` paths, but due to improper filesystem compatibility,
> you must avoid placing your project files on the Windows filesystem. Instead, clone your repository directly into
> the WSL2 filesystem (e.g., somewhere under `$HOME`).

This setup does not require your Windows host do have Docker Engine installed, as Docker will run entirely within the
WSL2 environment. You can now follow the instructions in [Quick Start](../quick-start.md) to set up the development
container within WSL2.
