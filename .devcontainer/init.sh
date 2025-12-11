#!/bin/bash

# Change the group of the workspace to "runner" user
sudo chgrp -R runner /workspace
sudo chmod -R g+w /workspace

# Keep the container running
tail -f /dev/null
