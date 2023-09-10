#! /bin/bash
# user-data script should be start with shebang #!/bin/bash

# to write log for this script
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# write your own script below.