#!/usr/bin/env bash
# ==============================================================================
# OpenWrapper Host Setup & Kernel Optimization Script
# Target: Oracle Cloud Infrastructure (OCI) Ampere A1 ARM64 (Ubuntu / Oracle Linux)
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo " Starting OpenWrapper Host Initialization for Oracle Cloud Ampere A1"
echo "======================================================================"

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (or via sudo)." >&2
    exit 1
fi

# 1. Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME=$ID
else
    echo "Cannot determine OS distribution" >&2
    exit 1
fi

echo "✓ Detected OS: ${OS_NAME} ${VERSION_ID:-}"

# 2. Package updates and prerequisites
echo "Updating package repositories..."
if [[ "${OS_NAME}" == "ubuntu" || "${OS_NAME}" == "debian" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y --no-install-recommends \
        curl wget gnupg ca-certificates lsb-release jq gzip pigz \
        iptables-persistent net-tools htop iotop
elif [[ "${OS_NAME}" == "ol" || "${OS_NAME}" == "centos" || "${OS_NAME}" == "rhel" ]]; then
    yum install -y yum-utils curl wget jq gzip pigz iptables-services net-tools htop iotop
fi

# 3. Install Docker CE (ARM64) if not installed
if ! command -v docker &>/dev/null; then
    echo "Installing Docker CE..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✓ Docker CE installed successfully."
else
    echo "✓ Docker CE is already installed: $(docker --version)"
fi

# 4. Install Docker Compose plugin if needed
if ! docker compose version &>/dev/null; then
    echo "Installing Docker Compose v2 plugin..."
    if [[ "${OS_NAME}" == "ubuntu" || "${OS_NAME}" == "debian" ]]; then
        apt-get install -y docker-compose-plugin
    else
        yum install -y docker-compose-plugin
    fi
    echo "✓ Docker Compose installed: $(docker compose version)"
else
    echo "✓ Docker Compose plugin is active: $(docker compose version)"
fi

# 5. Fix Oracle Cloud Default Restrictive Firewall (allow docker internal networks)
echo "Tuning firewall rules for Docker container communication..."
if command -v iptables &>/dev/null; then
    iptables -P FORWARD ACCEPT || true
    if [[ "${OS_NAME}" == "ubuntu" || "${OS_NAME}" == "debian" ]]; then
        netfilter-persistent save || true
    fi
fi

# 6. Create 4 GB Swap File for emergency burst headroom
SWAP_FILE="/swapfile"
if [ ! -f "$SWAP_FILE" ]; then
    echo "Allocating 4 GB swap file at ${SWAP_FILE}..."
    fallocate -l 4G "$SWAP_FILE" || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=4096
    chmod 600 "$SWAP_FILE"
    mkswap "$SWAP_FILE"
    swapon "$SWAP_FILE"
    if ! grep -q "$SWAP_FILE" /etc/fstab; then
        echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
    fi
    echo "✓ 4 GB swap enabled."
else
    echo "✓ Swap file already exists."
fi

# 7. Kernel & Network Tuning (BBR, High Connection Limits, TCP reuse)
echo "Applying Linux kernel sysctl optimizations..."
cat <<'EOF' > /etc/sysctl.d/99-openwrapper.conf
# Virtual Memory & Swappiness (keep swappiness low for 24GB RAM)
vm.swappiness = 10
vm.vfs_cache_pressure = 50
vm.max_map_count = 262144

# File Descriptors & Socket Backlog
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535

# TCP Memory & Buffer Tuning
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# TCP Connection Reuse & Timeouts
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 15
net.ipv4.tcp_keepalive_probes = 5

# Enable Google BBR TCP Congestion Control (Low Latency / High Throughput)
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF

sysctl --system >/dev/null 2>&1 || true
echo "✓ Sysctl tuned (BBR Congestion Control, socket buffers, 65k backlogs)."

# 8. User Limits for high concurrency
cat <<'EOF' > /etc/security/limits.d/openwrapper.conf
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
root soft nofile 65536
root hard nofile 65536
EOF
echo "✓ Security limits configured for 65k file descriptors."

# 9. Create Backup & State Directories
mkdir -p /var/backups/openwrapper
chmod 700 /var/backups/openwrapper
echo "✓ Backup directory initialized at /var/backups/openwrapper."

# 10. Configure Docker daemon log rotation defaults
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
    cat <<'EOF' > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  }
}
EOF
    systemctl restart docker || true
    echo "✓ Docker daemon configured with default 20m log rotation."
fi

echo "======================================================================"
echo " Host setup completed successfully!"
echo " Next: Configure infra/.env and run: bash infra/scripts/deploy.sh"
echo "======================================================================"
