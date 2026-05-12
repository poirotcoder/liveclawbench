FROM liveclawbench-base:latest

# Fix: /bin/sh -> bash (OpenClaw install.sh uses pipefail which dash doesn't support)
RUN ln -sf /bin/bash /bin/sh

# Copy mock-health binary
COPY mock-health /opt/mock/bin/mock-health
RUN chmod +x /opt/mock/bin/mock-health

COPY entrypoint.sh /opt/mock/health-entrypoint.sh
RUN chmod +x /opt/mock/health-entrypoint.sh

COPY . /workspace/environment/

RUN mkdir -p /workspace/output

# ENTRYPOINT starts mock-health and then execs whatever CMD harbor passes.
# This keeps the service running regardless of the agent command harbor injects.
ENTRYPOINT ["/opt/mock/health-entrypoint.sh"]
CMD ["sleep", "infinity"]
