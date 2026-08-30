#!/usr/bin/env python3
"""Агент-сборщик «Харденинг» для Linux-хостов.

Собирает факты о конфигурации хоста (SSH, firewall, обновления, парольная
политика, ядро, Docker) и список установленного ПО, затем отправляет их
на бэкенд POST /api/ingest, где движок сравнения (app/services/hardening_engine.py)
сверяет факты с hardening_rules и пересчитывает compliance_score.

Зависимости: только стандартная библиотека Python 3 — скрипт не требует
pip install и запускается на целевом хосте как есть.

Пример запуска:
    python3 collector.py \\
        --api-url https://hardening.example.com \\
        --api-key <ключ, выданный create_agent_key.py> \\
        --environment prod

Ключ агента передаётся через --api-key либо переменную окружения
HARDENING_AGENT_API_KEY (предпочтительно — не остаётся в истории shell).
"""
import argparse
import json
import os
import re
import socket
import subprocess
import sys
import urllib.error
import urllib.request


def read_file(path: str) -> str | None:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def run(cmd: list[str]) -> str | None:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            return None
        return result.stdout
    except (OSError, subprocess.SubprocessError):
        return None


# --- sshd_config -------------------------------------------------------

SSHD_DEFAULTS = {
    "permitrootlogin": "no",  # дефолт современных sshd (>= 7.0); старые сборки — "yes"
    "passwordauthentication": "yes",
    "permitemptypasswords": "no",
    "x11forwarding": "no",
    "maxauthtries": "6",
}


def parse_sshd_config(text: str) -> dict:
    values = dict(SSHD_DEFAULTS)
    for line in text.splitlines():
        line = line.split("#", 1)[0].strip()
        if not line or " " not in line:
            continue
        key, _, value = line.partition(" ")
        key = key.strip().lower()
        value = value.strip()
        if key in values and value:
            values[key] = value
    return {
        "permit_root_login": values["permitrootlogin"].lower(),
        "password_authentication": values["passwordauthentication"].lower(),
        "permit_empty_passwords": values["permitemptypasswords"].lower(),
        "x11_forwarding": values["x11forwarding"].lower(),
        "max_auth_tries": values["maxauthtries"],
    }


def collect_ssh_facts() -> dict:
    sshd_config = read_file("/etc/ssh/sshd_config")
    if sshd_config is None:
        return {}
    return parse_sshd_config(sshd_config)


# --- firewall (ufw) ------------------------------------------------------

def collect_firewall_facts() -> dict:
    facts = {}

    ufw_conf = read_file("/etc/ufw/ufw.conf")
    if ufw_conf is not None:
        m = re.search(r"^\s*ENABLED\s*=\s*(\w+)", ufw_conf, re.MULTILINE)
        if m:
            facts["ufw_enabled"] = "true" if m.group(1).lower() == "yes" else "false"

    status_output = run(["ufw", "status", "verbose"])
    if status_output:
        if re.search(r"Status:\s*active", status_output, re.IGNORECASE):
            facts["ufw_enabled"] = "true"
        elif re.search(r"Status:\s*inactive", status_output, re.IGNORECASE):
            facts["ufw_enabled"] = "false"
        m = re.search(r"Default:\s*(deny|allow|reject)\s*\(incoming\)", status_output, re.IGNORECASE)
        if m:
            facts["default_incoming_policy"] = m.group(1).lower()

    if "default_incoming_policy" not in facts:
        ufw_defaults = read_file("/etc/default/ufw")
        if ufw_defaults is not None:
            m = re.search(r'^\s*DEFAULT_INPUT_POLICY\s*=\s*"?(\w+)"?', ufw_defaults, re.MULTILINE)
            if m:
                facts["default_incoming_policy"] = m.group(1).lower()

    return facts


# --- unattended-upgrades ---------------------------------------------------

def collect_updates_facts() -> dict:
    conf = read_file("/etc/apt/apt.conf.d/20auto-upgrades")
    if conf is None:
        return {}
    m = re.search(r'Unattended-Upgrade\s+"(\d)"', conf)
    if not m:
        return {}
    return {"unattended_upgrades_enabled": "true" if m.group(1) == "1" else "false"}


# --- password policy -------------------------------------------------------

def collect_password_policy_facts() -> dict:
    facts = {}

    login_defs = read_file("/etc/login.defs")
    if login_defs is not None:
        m = re.search(r"^\s*PASS_MAX_DAYS\s+(\d+)", login_defs, re.MULTILINE)
        if m:
            facts["pass_max_days"] = m.group(1)

    pwquality = read_file("/etc/security/pwquality.conf")
    if pwquality is not None:
        m = re.search(r"^\s*minlen\s*=\s*(\d+)", pwquality, re.MULTILINE)
        if m:
            facts["pass_min_len"] = m.group(1)

    faillock = read_file("/etc/security/faillock.conf")
    common_auth = read_file("/etc/pam.d/common-auth")
    has_faillock = bool(faillock) or bool(common_auth and "pam_faillock" in common_auth)
    has_tally2 = bool(common_auth and "pam_tally2" in common_auth)
    if common_auth is not None:
        facts["lockout_on_failure"] = "true" if (has_faillock or has_tally2) else "false"

    return facts


# --- kernel ------------------------------------------------------------

def collect_kernel_facts() -> dict:
    value = read_file("/proc/sys/net/ipv4/ip_forward")
    if value is None:
        return {}
    return {"ip_forward": value.strip()}


# --- docker --------------------------------------------------------------

def collect_docker_facts() -> dict:
    ids_output = run(["docker", "ps", "-q"])
    if ids_output is None:
        return {}
    ids = [line for line in ids_output.splitlines() if line.strip()]
    if not ids:
        return {"no_privileged_containers": "true"}

    inspect_output = run(["docker", "inspect", "--format", "{{.HostConfig.Privileged}}", *ids])
    if inspect_output is None:
        return {}
    any_privileged = any(line.strip().lower() == "true" for line in inspect_output.splitlines())
    return {"no_privileged_containers": "false" if any_privileged else "true"}


# --- asset / software ------------------------------------------------------

def get_os_pretty_name() -> str | None:
    os_release = read_file("/etc/os-release")
    if not os_release:
        return None
    m = re.search(r'^PRETTY_NAME="?([^"\n]+)"?', os_release, re.MULTILINE)
    return m.group(1) if m else None


def get_primary_ip() -> str | None:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
        finally:
            s.close()
    except OSError:
        return None


def collect_software() -> list[dict]:
    """dpkg (Debian/Ubuntu) в приоритете, rpm — фолбэк для RHEL-семейства."""
    dpkg_output = run(["dpkg-query", "-W", "-f=${Package}\t${Version}\t${Source}\n"])
    if dpkg_output is not None:
        items = []
        for line in dpkg_output.splitlines():
            parts = line.split("\t")
            if len(parts) < 2 or not parts[0]:
                continue
            name, version = parts[0], parts[1]
            items.append({"name": name, "version": version or None, "vendor": None, "category": "os-package", "type": "package"})
        return items

    rpm_output = run(["rpm", "-qa", "--qf", "%{NAME}\t%{VERSION}-%{RELEASE}\n"])
    if rpm_output is not None:
        items = []
        for line in rpm_output.splitlines():
            parts = line.split("\t")
            if len(parts) < 2 or not parts[0]:
                continue
            items.append({"name": parts[0], "version": parts[1] or None, "vendor": None, "category": "os-package", "type": "package"})
        return items

    return []


def collect_facts() -> dict:
    facts = {}
    ssh = collect_ssh_facts()
    if ssh:
        facts["ssh"] = ssh
    firewall = collect_firewall_facts()
    if firewall:
        facts["firewall"] = firewall
    updates = collect_updates_facts()
    if updates:
        facts["updates"] = updates
    password_policy = collect_password_policy_facts()
    if password_policy:
        facts["password_policy"] = password_policy
    kernel = collect_kernel_facts()
    if kernel:
        facts["kernel"] = kernel
    docker_facts = collect_docker_facts()
    if docker_facts:
        facts["docker"] = docker_facts
    return facts


def build_payload(args: argparse.Namespace) -> dict:
    return {
        "environment": args.environment,
        "asset": {
            "hostname": args.hostname or socket.gethostname(),
            "ip_address": args.ip_address or get_primary_ip(),
            "os": get_os_pretty_name(),
            "asset_type": args.asset_type,
            "criticality": args.criticality,
        },
        "software": collect_software(),
        "facts": collect_facts(),
        "scan_label": args.scan_label,
    }


def send_ingest(api_url: str, api_key: str, payload: dict, timeout: int = 30) -> dict:
    url = api_url.rstrip("/") + "/api/ingest"
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Agent-Api-Key": api_key,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Бэкенд отклонил данные: HTTP {exc.code} — {detail}")
    except urllib.error.URLError as exc:
        raise SystemExit(f"Не удалось связаться с бэкендом ({url}): {exc.reason}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-url", required=True, help="Базовый URL бэкенда, например https://hardening.example.com")
    parser.add_argument("--api-key", default=os.environ.get("HARDENING_AGENT_API_KEY"), help="Ключ агента (или переменная окружения HARDENING_AGENT_API_KEY)")
    parser.add_argument("--environment", required=True, help="Имя окружения (prod/staging/…), создаётся автоматически при первом прогоне")
    parser.add_argument("--hostname", default=None, help="По умолчанию — hostname хоста")
    parser.add_argument("--ip-address", default=None, help="По умолчанию — определяется автоматически")
    parser.add_argument("--asset-type", default="server", help="Тип актива (по умолчанию: server)")
    parser.add_argument("--criticality", default="medium", choices=["low", "medium", "high", "critical"])
    parser.add_argument("--scan-label", default=None, help="Метка прогона для отчёта")
    parser.add_argument("--dry-run", action="store_true", help="Собрать факты и вывести payload, не отправляя на бэкенд")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])

    if not args.dry_run and not args.api_key:
        print("Ошибка: нужен --api-key или переменная окружения HARDENING_AGENT_API_KEY", file=sys.stderr)
        return 1

    payload = build_payload(args)

    if args.dry_run:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    result = send_ingest(args.api_url, args.api_key, payload)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
