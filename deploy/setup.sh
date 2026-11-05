#!/usr/bin/env bash
# One-time setup (and safe to run again) on a fresh Oracle Cloud Ubuntu server.
# Run from the deploy folder:  bash setup.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Adding swap space on small servers (if needed)"
# The free AMD micro server has 1 GB of memory, which isn't enough to build the app. Swap (extra
# memory on disk) makes the build work; it's slower, but only the build needs it.
total_mb=$(free -m | awk '/^Mem:/ {print $2}')
if [ "$total_mb" -lt 3000 ] && ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-chibidink-swap.conf >/dev/null
  sudo sysctl -p /etc/sysctl.d/99-chibidink-swap.conf >/dev/null
fi

echo "==> Installing Docker (if needed)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi

echo "==> Turning on automatic security updates"
sudo apt-get update -y >/dev/null
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades >/dev/null
sudo dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

echo "==> Opening ports 80 and 443 in the server's firewall"
# Oracle's Ubuntu images block everything except SSH; insert the rules before their REJECT rule.
sudo apt-get update -y >/dev/null
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null
open_port() {
  local proto=$1 port=$2
  if ! sudo iptables -C INPUT -p "$proto" --dport "$port" -j ACCEPT 2>/dev/null; then
    local at
    at=$(sudo iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
    sudo iptables -I INPUT "${at:-1}" -p "$proto" --dport "$port" -j ACCEPT
  fi
}
open_port tcp 80
open_port tcp 443
open_port udp 443
sudo netfilter-persistent save >/dev/null

echo "==> Checking settings"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created deploy/.env. Fill in DOMAIN and the connection string (nano .env), then run this script again."
  exit 1
fi
chmod 600 .env # only you can read the database password
if grep -q "YOURPASSWORD" .env; then
  echo "deploy/.env still has the example values. Edit it (nano .env), then run this script again."
  exit 1
fi

echo "==> Building and starting ChibiDink (the first build takes a few minutes; on the small 1 GB server 20-40 minutes)"
sudo docker compose up -d --build

echo "==> Waiting for the app to start"
for _ in $(seq 1 60); do
  if sudo docker compose logs app 2>/dev/null | grep -q "Application started"; then break; fi
  sleep 3
done
sudo docker compose ps
echo
echo "Done. Open https://$(grep ^DOMAIN= .env | cut -d= -f2) (the HTTPS certificate can take a minute the first time)."
echo "Logs:   sudo docker compose logs -f app"
