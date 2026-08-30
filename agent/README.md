# Агент-сборщик

Скрипт `collector.py` собирает факты о конфигурации Linux-хоста (SSH, firewall,
автообновления, парольная политика, ядро, Docker) и список установленного ПО,
затем отправляет их на бэкенд (`POST /api/ingest`). Дальше движок сравнения
(`app/services/hardening_engine.py`) сверяет факты с `hardening_rules` и
пересчитывает `compliance_score`.

Зависимостей нет — только стандартная библиотека Python 3.9+. Копируется на
целевой хост как один файл.

## Выдача ключа агента

На бэкенде для организации нужен ключ агента (хранится в БД только его хэш):

```bash
python -m app.commands.create_agent_key
```

## Запуск на целевом хосте

```bash
python3 collector.py \
  --api-url https://hardening.example.com \
  --environment prod \
  --criticality high \
  --scan-label "плановый прогон"
```

Ключ передаётся через переменную окружения (не остаётся в истории shell):

```bash
export HARDENING_AGENT_API_KEY=<ключ>
python3 collector.py --api-url https://hardening.example.com --environment prod
```

Проверить, что соберётся, без реальной отправки:

```bash
python3 collector.py --api-url http://localhost:8000 --environment prod --dry-run
```

## Что собирается

| Категория | Источник |
|---|---|
| `ssh.*` | `/etc/ssh/sshd_config` |
| `firewall.*` | `ufw status verbose`, `/etc/ufw/ufw.conf`, `/etc/default/ufw` |
| `updates.*` | `/etc/apt/apt.conf.d/20auto-upgrades` |
| `password_policy.*` | `/etc/login.defs`, `/etc/security/pwquality.conf`, `/etc/pam.d/common-auth` |
| `kernel.*` | `/proc/sys/net/ipv4/ip_forward` |
| `docker.*` | `docker ps` + `docker inspect` (если Docker установлен) |
| ПО | `dpkg-query` (Debian/Ubuntu), фолбэк на `rpm -qa` |

Правило, для которого агент не прислал факт (например `postgres.ssl_enabled`
на хосте без PostgreSQL), получает статус `error`, а не `fail` — движок
не считает отсутствие данных нарушением.
