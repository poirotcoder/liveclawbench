FROM liveclawbench-health-daily-record-base:latest

# Fix: /bin/sh -> bash (OpenClaw install.sh uses pipefail which dash doesn't support)
RUN ln -sf /bin/bash /bin/sh

COPY . /workspace/environment/

RUN mkdir -p /workspace/output

CMD ["sh", "-c", "sleep infinity"]
