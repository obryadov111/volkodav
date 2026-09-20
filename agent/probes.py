"""Движок проб агента «Харденинг»: выполняет пробы из манифеста пака.

Зависимости: только стандартная библиотека Python 3.9+ (как и collector.py).

Агент — последний рубеж защиты и не доверяет манифесту слепо, даже подписанному:
  * выполняются только типы проб из закрытого списка PROBES, и только на чтение;
  * локальные команды — только из белого списка LOCAL_COMMAND_POLICY, без shell (argv);
  * файловые пробы не читают секреты (DENIED_PATH_PATTERNS), символические ссылки
    разворачиваются до проверки; права файла проверяются через file_stat без чтения содержимого;
  * по SSH выполняются только команды на чтение (is_readonly_cli);
  * подпись манифеста (HMAC-SHA256) проверяется до выполнения чего-либо.

Ограничение подписи: ключ симметричный, им же проверяет агент, поэтому компрометация
хоста с агентом раскрывает ключ подписи. Ключ подписи должен быть отдельным от ключа
агента и своим на организацию; при желании схема заменяется на асимметричную
(Ed25519) без изменения формата манифеста.
"""
from __future__ import annotations

import glob
import hashlib
import hmac
import json
import os
import re
import shutil
import subprocess
import time

MANIFEST_SCHEMA = 1
SAFE_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
MAX_FILE_BYTES = 2_000_000
COMMAND_TIMEOUT = 15
MAX_INCLUDE_DEPTH = 5
MAX_INCLUDE_FILES = 50


class ManifestError(Exception):
    """Манифест не прошёл проверку (подпись, схема) — выполнять его нельзя."""


class ProbeError(Exception):
    """Проба не смогла выполниться (нет файла, команда запрещена или недоступна)."""


# --- подпись манифеста ----------------------------------------------------------

def canonical_json(manifest: dict) -> bytes:
    """Те же байты, что формирует сервер (app/services/packs/manifest.py)."""
    return json.dumps(manifest, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def verify_manifest(manifest: dict, signature: str, key: str) -> bool:
    expected = hmac.new(key.encode("utf-8"), canonical_json(manifest), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


def load_verified_manifests(response: dict, key: str) -> list[dict]:
    """Проверяет подпись каждого манифеста из ответа сервера. Любая подделка — ManifestError:
    это событие безопасности, а не повод молча пропустить один пак."""
    verified = []
    for item in response.get("manifests", []):
        manifest, signature = item.get("manifest"), item.get("signature")
        if not isinstance(manifest, dict) or not verify_manifest(manifest, signature, key):
            name = manifest.get("pack") if isinstance(manifest, dict) else "?"
            raise ManifestError(f"Подпись манифеста {name!r} неверна — выполнение остановлено")
        if manifest.get("schema") != MANIFEST_SCHEMA:
            raise ManifestError(f"Неподдерживаемая схема манифеста {manifest.get('schema')!r}")
        verified.append(manifest)
    return verified


# --- ограничения -----------------------------------------------------------------

DENIED_PATH_PATTERNS = [
    re.compile(p)
    for p in (
        r"^/etc/g?shadow-?$",
        r"^/etc/security/opasswd$",
        r"^/etc/ssh/ssh_host_.*_key$",
        r"^/root/\.ssh/",
        r"^/home/[^/]+/\.ssh/",
        r"/id_(rsa|dsa|ecdsa|ed25519)$",
        r"\.(pem|key|p12|pfx)$",
        r"^/proc/[^/]+/environ$",
    )
]

# Локальные команды: исполняемый файл -> допустимые аргументы (строка через пробел). Только чтение.
LOCAL_COMMAND_POLICY = {
    "systemctl": re.compile(r"^(is-active|is-enabled|is-failed) [A-Za-z0-9_.@:-]+$"),
    "ufw": re.compile(r"^status( verbose)?$"),
    "dpkg-query": re.compile(r"^-W -f=\S+ [A-Za-z0-9_.+:-]+$"),
    "rpm": re.compile(r"^-q --qf \S+ [A-Za-z0-9_.+:-]+$"),
    "sysctl": re.compile(r"^-n [a-z0-9_.]+$"),
    "getenforce": re.compile(r"^$"),
    "aa-status": re.compile(r"^--enabled$"),
    "timedatectl": re.compile(r"^show( -p [A-Za-z]+)?( --value)?$"),
    "ss": re.compile(r"^-[tuln]+p?$"),
}

CLI_FILTERS = ("include", "exclude", "begin", "section", "count", "match", "except")
_CLI_SEGMENT = re.compile(r"^[A-Za-z0-9 _./^:\-]+$")
_CLI_READONLY = re.compile(r"^(show|display) [A-Za-z0-9 _./^:\-]+$|^/export( [A-Za-z0-9 _./=\-]+)?$|^/[a-z0-9/ -]+ print( [A-Za-z0-9 _./=\-]+)?$")
# Слово-секрет — отдельное слово: не часть составного (prohibit-password, password-encryption, PasswordAuthentication).
_SECRET_WORDS = re.compile(r"(?i)(?<![\w-])(password|passwd|secret|community|token|hash|psk|pre-shared-key|private-key)(?![\w-]).*$")
_HOST_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]*$")
_USER_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]*$")


def is_readonly_cli(command: str) -> bool:
    """Команда конфигурации сетевого устройства только на чтение. После `|` допустимы лишь
    фильтры вывода самого устройства (include/exclude/…), а не произвольные команды."""
    if len(command) > 200:
        return False
    head, *filters = command.split("|")
    if not _CLI_READONLY.match(head.strip()):
        return False
    for segment in filters:
        words = segment.strip().split(None, 1)
        if not words or words[0] not in CLI_FILTERS or not _CLI_SEGMENT.match(segment):
            return False
    return True


def redact(line: str) -> str:
    """Свидетельство для отчёта: всё, что идёт после слова-секрета, маскируется. Хэши паролей
    и SNMP-community не покидают хост."""
    return _SECRET_WORDS.sub(lambda m: m.group(1) + " ***", line.strip())[:300]


class CmdOutput:
    def __init__(self, stdout: str, stderr: str, code: int):
        self.stdout, self.stderr, self.code = stdout, stderr, code

    @property
    def text(self) -> str:
        return self.stdout if self.stdout.strip() else self.stderr


# --- транспорты ------------------------------------------------------------------

class LocalTransport:
    """Пробы выполняются на самом хосте, где запущен агент."""

    name = "local"

    def _check_path(self, path: str) -> str:
        real = os.path.realpath(path)
        for candidate in (path, real):
            if any(p.search(candidate) for p in DENIED_PATH_PATTERNS):
                raise ProbeError(f"чтение {candidate} запрещено политикой агента")
        return real

    def read_file(self, path: str) -> str:
        real = self._check_path(path)
        try:
            with open(real, encoding="utf-8", errors="replace") as fh:
                return fh.read(MAX_FILE_BYTES)
        except OSError as exc:
            raise ProbeError(f"не удалось прочитать {path}: {exc.strerror or exc}") from exc

    def stat_file(self, path: str) -> os.stat_result:
        try:
            return os.stat(path)
        except OSError as exc:
            raise ProbeError(f"не удалось получить stat {path}: {exc.strerror or exc}") from exc

    def glob(self, pattern: str) -> list[str]:
        """Файлы по маске в лексическом порядке; запрещённые политикой пути в выдачу не попадают."""
        found = sorted(glob.glob(pattern))[:MAX_INCLUDE_FILES]
        return [p for p in found if not any(d.search(p) or d.search(os.path.realpath(p)) for d in DENIED_PATH_PATTERNS)]

    def run(self, argv: list[str]) -> CmdOutput:
        policy = LOCAL_COMMAND_POLICY.get(argv[0]) if argv else None
        if policy is None or not policy.match(" ".join(argv[1:])):
            raise ProbeError(f"команда вне белого списка агента: {' '.join(argv)}")
        exe = shutil.which(argv[0], path=SAFE_PATH)
        if exe is None:
            raise ProbeError(f"команда {argv[0]} не найдена")
        try:
            proc = subprocess.run(
                [exe, *argv[1:]], capture_output=True, text=True, timeout=COMMAND_TIMEOUT,
                env={"PATH": SAFE_PATH, "LANG": "C", "LC_ALL": "C"}, check=False,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            raise ProbeError(f"команда {argv[0]} не выполнилась: {exc}") from exc
        return CmdOutput(proc.stdout, proc.stderr, proc.returncode)

    def run_cli(self, command: str) -> CmdOutput:
        raise ProbeError("cli_config недоступна на локальном транспорте")


class SshTransport:
    """Внешний сбор с сетевого устройства по SSH. Учётка на устройстве — только на чтение,
    ключ/пароль вне пака. Проверка ключа хоста включена и не отключается: устройство должно
    быть в known_hosts (иначе это подмена устройства, а не повод продолжать)."""

    name = "ssh"

    def __init__(self, host: str, user: str | None = None, port: int = 22, key_path: str | None = None,
                 connect_timeout: int = 10, command_timeout: int = 30, runner=None):
        if not _HOST_RE.match(host) or (user is not None and not _USER_RE.match(user)):
            raise ValueError("недопустимое имя хоста или пользователя SSH")
        self.destination = f"{user}@{host}" if user else host
        self.port, self.key_path = port, key_path
        self.connect_timeout, self.command_timeout = connect_timeout, command_timeout
        self._runner = runner or subprocess.run

    def _ssh_argv(self, command: str) -> list[str]:
        argv = ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
                "-o", f"ConnectTimeout={self.connect_timeout}", "-p", str(self.port)]
        if self.key_path:
            argv += ["-i", self.key_path]
        return argv + ["--", self.destination, command]

    def run_cli(self, command: str) -> CmdOutput:
        if not is_readonly_cli(command):
            raise ProbeError(f"по SSH допустимы только команды на чтение: {command!r}")
        try:
            proc = self._runner(self._ssh_argv(command), capture_output=True, text=True,
                                timeout=self.command_timeout, check=False)
        except (OSError, subprocess.SubprocessError) as exc:
            raise ProbeError(f"SSH-команда не выполнилась: {exc}") from exc
        if proc.returncode == 255:  # код самого ssh: соединение/аутентификация/ключ хоста
            raise ProbeError(f"ssh: {(proc.stderr or '').strip()[:200] or 'ошибка соединения'}")
        return CmdOutput(proc.stdout, proc.stderr, proc.returncode)

    def run(self, argv: list[str]) -> CmdOutput:
        return self.run_cli(" ".join(argv))

    def read_file(self, path: str) -> str:
        raise ProbeError("файловые пробы недоступны на транспорте ssh")

    def stat_file(self, path: str) -> os.stat_result:
        raise ProbeError("file_stat недоступна на транспорте ssh")


# --- пробы -----------------------------------------------------------------------

def _ok(value, evidence: str | None = None) -> dict:
    return {"found": True, "value": value, "evidence": redact(evidence) if evidence else None}


def _search(pattern: str, text: str) -> tuple[str | None, str | None]:
    m = re.search(pattern, text, re.MULTILINE)
    if not m:
        return None, None
    return (m.group(1) if m.groups() else m.group(0)), m.group(0)


def _expand_lines(t, path: str, base_dir: str, follow_include: bool, skip_match: bool, state: dict, depth: int = 0):
    """Строки файла в порядке разбора. Include подставляется на месте директивы (как в sshd: маска,
    относительные пути — от base_dir, файлы по маске в лексическом порядке). Строки после Match
    условные и в глобальное значение не входят; в sshd блок Match заканчивается вместе с файлом,
    поэтому Match во включённом файле не «протекает» в следующий."""
    for raw in t.read_file(path).splitlines():
        line = raw.strip()
        lowered = line.lower()
        if skip_match and lowered.startswith("match "):
            return
        if follow_include and lowered.startswith("include "):
            if depth >= MAX_INCLUDE_DEPTH:
                continue
            for pattern in line.split()[1:]:
                full = pattern if pattern.startswith("/") else base_dir.rstrip("/") + "/" + pattern
                for included in t.glob(full):
                    if state["files"] >= MAX_INCLUDE_FILES:
                        return
                    state["files"] += 1
                    try:
                        yield from _expand_lines(t, included, base_dir, follow_include, skip_match, state, depth + 1)
                    except ProbeError:
                        continue  # нечитаемый включаемый файл не отменяет остальные
            continue
        yield raw


def probe_file_kv(t, p: dict) -> dict:
    """Параметр `ключ значение` / `ключ=значение`. Для формата whitespace (sshd_config) разбор в каждом
    файле останавливается на строке Match — параметры ниже неё условные. С follow_include: true
    директивы Include раскрываются (на Ubuntu 22.04+ параметры sshd лежат и в sshd_config.d/*.conf,
    а первое найденное значение побеждает)."""
    key, sep = p["key"], p.get("separator", "whitespace")
    ignore_case, take_last = p.get("ignore_case", True), p.get("match", "first") == "last"
    lines = _expand_lines(t, p["path"], os.path.dirname(p["path"]), bool(p.get("follow_include")),
                          sep == "whitespace", {"files": 0})
    value = line_found = None
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("=", 1) if sep == "equals" else line.split(None, 1)
        if len(parts) != 2:
            continue
        name = parts[0].strip()
        if (name.lower() == key.lower()) if ignore_case else (name == key):
            value, line_found = parts[1].strip().strip('"').strip("'"), line
            if not take_last:
                break
    if value is None:
        default = p.get("default")
        return _ok(default, "(значение по умолчанию)") if default is not None else _ok(None)
    return _ok(value, line_found)


def probe_file_regex(t, p: dict) -> dict:
    value, matched = _search(p["pattern"], t.read_file(p["path"]))
    return _ok(value, matched)


def probe_file_stat(t, p: dict) -> dict:
    st = t.stat_file(p["path"])
    field = p.get("field", "mode")
    if field == "mode":
        return _ok(format(st.st_mode & 0o7777, "o"))
    if field in ("uid", "gid"):
        return _ok(getattr(st, "st_" + field))
    try:
        import grp
        import pwd
        name = pwd.getpwuid(st.st_uid).pw_name if field == "owner" else grp.getgrgid(st.st_gid).gr_name
    except (ImportError, KeyError):
        name = str(st.st_uid if field == "owner" else st.st_gid)
    return _ok(name)


def probe_cmd_regex(t, p: dict) -> dict:
    out = t.run(p["cmd"])
    value, matched = _search(p["pattern"], out.text)
    return _ok(value, matched)


def probe_cli_config(t, p: dict) -> dict:
    lines = t.run_cli(p["cmd"]).stdout.splitlines()
    section = p.get("section")
    if section is not None:
        scoped, inside = [], False
        for line in lines:
            if line[:1] not in (" ", "\t") and line.strip():
                inside = re.search(section, line) is not None
            elif inside:
                scoped.append(line)
        lines = scoped
    for line in lines:
        m = re.search(p["match"], line)
        if m:
            return _ok(m.group(1) if m.groups() else line.strip(), line)
    return _ok(None)


def probe_service_state(t, p: dict) -> dict:
    verb = "is-enabled" if p.get("field") == "enabled" else "is-active"
    out = t.run(["systemctl", verb, p["service"]])
    state = out.stdout.strip() or out.stderr.strip()
    if not state:
        raise ProbeError(f"systemctl не вернул состояние службы {p['service']}")
    return _ok(state.splitlines()[0])


def probe_pkg_version(t, p: dict) -> dict:
    name = p["package"]
    if shutil.which("dpkg-query", path=SAFE_PATH):
        out = t.run(["dpkg-query", "-W", "-f=${Status}|${Version}", name])
        status, _, version = out.stdout.partition("|")
        return _ok(version.strip() if status.startswith("install ok installed") and version.strip() else None)
    out = t.run(["rpm", "-q", "--qf", "%{VERSION}-%{RELEASE}", name])
    text = out.stdout.strip()
    return _ok(None if (not text or "is not installed" in text) else text)


def probe_first_of(t, p: dict) -> dict:
    """Источники по порядку: результат первой пробы, нашедшей значение. Так старый сборщик получал
    состояние ufw: `ufw status` (нужен root), иначе файл конфигурации. Если ни одна не нашла значение,
    но хоть один источник прочитан — значение пусто; если ни один не доступен — проба не выполнилась."""
    readable, last_error = False, None
    for sub in p["probes"]:
        if sub.get("type") == "first_of":
            raise ProbeError("first_of не может содержать другой first_of")
        result = run_probe(t, sub)
        if result["found"]:
            readable = True
            if result["value"] is not None:
                return result
        else:
            last_error = result.get("error")
    if readable:
        return _ok(None)
    raise ProbeError(last_error or "ни один источник first_of недоступен")


PROBES = {
    "file_kv": probe_file_kv,
    "file_regex": probe_file_regex,
    "file_stat": probe_file_stat,
    "cmd_regex": probe_cmd_regex,
    "cli_config": probe_cli_config,
    "service_state": probe_service_state,
    "pkg_version": probe_pkg_version,
    "first_of": probe_first_of,
}


def run_probe(transport, probe: dict) -> dict:
    """Результат пробы: {found, value, evidence[, error]}. found=False — проба не смогла выполниться."""
    handler = PROBES.get(probe.get("type"))
    try:
        if handler is None:
            raise ProbeError(f"тип пробы {probe.get('type')!r} не поддерживается агентом")
        return handler(transport, probe)
    except ProbeError as exc:
        return {"found": False, "value": None, "evidence": None, "error": str(exc)[:500]}


# --- манифест: детект и выполнение -------------------------------------------------

def matches_detect(transport, detect_rules: list[dict]) -> bool:
    """Платформа распознана, только если совпали все условия detect."""
    for rule in detect_rules:
        result = run_probe(transport, rule["probe"])
        if not result["found"] or result["value"] is None:
            return False
        actual = str(result["value"]).strip().strip('"').lower()
        if "equals" in rule:
            if actual != str(rule["equals"]).strip().lower():
                return False
        elif not re.search(rule["regex"], str(result["value"])):
            return False
    return True


def select_manifests(transport, manifests: list[dict]) -> list[dict]:
    return [m for m in manifests if m.get("transport") == transport.name and matches_detect(transport, m["detect"])]


def run_manifest(transport, manifest: dict, log=None) -> dict:
    """Выполняет пробы пака, возвращает {id проверки: результат}. log(entry) — журнал запуска
    (что и как долго выполнялось) для аудита самого агента."""
    results = {}
    for check in manifest["checks"]:
        started = time.monotonic()
        results[check["id"]] = run_probe(transport, check["probe"])
        if log:
            log({
                "pack": manifest["pack"], "version": manifest["version"], "check": check["id"],
                "probe": check["probe"].get("type"), "found": results[check["id"]]["found"],
                "seconds": round(time.monotonic() - started, 3),
            })
    return results
