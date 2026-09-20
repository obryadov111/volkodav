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


## Режим паков (`--use-packs`)

Вместо встроенных проверок агент собирает данные по **пакам платформ** — YAML-описаниям,
которые ведутся на сервере (`src/backend/app/packs/`). Добавление платформы или проверки
не требует нового релиза агента. Работает рядом с `probes.py` (движок проб; обычный режим
по-прежнему один файл `collector.py`).

Как это работает:

1. Агент запрашивает `GET /api/agent/manifests` — подписанные манифесты актуальных версий паков.
2. Проверяет подпись (HMAC-SHA256, ключ `HARDENING_PACK_KEY`). Подделка — остановка с кодом ошибки.
3. По условиям `detect` определяет, какой пак подходит платформе. Не распознана — ничего не отправляется.
   Подходит несколько — нужно указать `--pack`.
4. Выполняет только пробы этого пака (только чтение) и отправляет `probe_results` в `POST /api/ingest`.
   Сравнение с нормой (`assert`) делает сервер.

```bash
export HARDENING_AGENT_API_KEY=<ключ агента>
export HARDENING_PACK_KEY=<ключ проверки подписи; отдельный от ключа агента>
python3 collector.py --api-url https://hardening.example.com --environment prod --use-packs
```

Внешний сбор с сетевого устройства по SSH (с джамп-хоста; учётка на устройстве — только на чтение):

```bash
python3 collector.py --api-url https://hardening.example.com --environment net --use-packs \
  --ssh-host 10.0.0.1 --ssh-user audit --ssh-key ~/.ssh/audit_ed25519
```

Устройство должно быть в `known_hosts`: проверка ключа хоста включена и не отключается.

Что агент **не** делает, даже если так написано в подписанном манифесте: не запускает команды вне
белого списка (`LOCAL_COMMAND_POLICY`), не использует shell, не читает секреты (`/etc/shadow`,
приватные ключи и т. п. — для прав файла есть проба `file_stat`), не выполняет по SSH ничего,
кроме команд на чтение. В свидетельстве проверки секреты (хэши паролей, SNMP-community) маскируются.
Каждая выполненная проба пишется в журнал (stderr).

Проверить без отправки: `--dry-run` (можно с `--manifests-file` — манифесты из файла).

Ограничения текущей версии: один пак на запуск и на актив (данные актива в `hardening_checks`
перезаписываются целиком); ключ подписи симметричный — см. `probes.py`.

Тесты агента: `pytest agent/tests`.
