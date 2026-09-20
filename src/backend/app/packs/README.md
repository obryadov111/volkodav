# Контент-паки платформ

Каждый `*.yaml` в этом каталоге (включая подкаталоги) — пак одной платформы. Пак — данные,
а не код: добавление платформы или проверки не требует релиза агента. Файл на версию
(`ubuntu-server-1.0.0.yaml`); старые версии не удаляются — результаты прогонов привязаны
к версии пака, и без неё прошлый отчёт нельзя воспроизвести.

Каталог можно переопределить переменной `PACKS_DIR`. Битый пак — ошибка с именем файла
и причиной, а не тихий пропуск.

## Формат

```yaml
pack: ubuntu-server             # id: a-z, 0-9, дефис
version: 1.0.0                  # MAJOR.MINOR.PATCH
maturity: baseline              # inventory | baseline | full | certified
verified_on: ["Ubuntu 22.04.4"] # обязательно для full/certified
tags: [linux-server, debian-family, ubuntu]   # класс → семейство → продукт
transport: local                # local | ssh
asset_type: linux-server        # необязательно

detect:                         # как распознать платформу (все условия должны совпасть)
  - probe: { type: file_kv, path: /etc/os-release, key: ID, separator: equals }
    equals: ubuntu              # либо regex: "..."

checks:
  - id: ssh.max_auth_tries      # категория.ключ
    title: Ограничить число попыток аутентификации
    probe: { type: file_kv, path: /etc/ssh/sshd_config, key: MaxAuthTries, default: "6" }
    assert: { op: lte, value: 4 }
    severity: medium            # critical | high | medium | low | info
    remediation: "MaxAuthTries 4 в /etc/ssh/sshd_config"
    refs: [{ source: "CIS Ubuntu 22.04", id: "5.1.x" }]
    control: AUTH-ATTEMPTS-LIMITED
```

Пак без проверок (`checks: []`) допустим только с `maturity: inventory`.

## Пробы (только чтение)

| type | Параметры | Результат |
|---|---|---|
| `file_kv` | `path`, `key`, `separator` (whitespace/equals), `default`, `match` (first/last), `ignore_case` | значение параметра |
| `file_regex` | `path`, `pattern` | группа 1 (или совпадение); нет совпадения — пусто |
| `file_stat` | `path`, `field` (mode/owner/group/uid/gid) | права/владелец без чтения содержимого |
| `cmd_regex` | `cmd` (argv, без shell), `pattern` | группа 1 (или совпадение) |
| `cli_config` | `cmd` (show/display, `/export`, `… print`), `match`, `section` | совпавшая строка конфигурации устройства |
| `service_state` | `service`, `field` (active/enabled) | состояние службы systemd |
| `pkg_version` | `package` | версия пакета; пусто — не установлен |

Агент выполняет только эти пробы и только команды из собственного белого списка.
Чтение `/etc/shadow` и ключей файловыми пробами запрещено (для прав — `file_stat`).

## Утверждения (`assert`)

`eq`, `ne`, `in`, `not_in` (список), `lt`, `lte`, `gt`, `gte` (число), `regex`, `exists`, `absent`,
`mode_within` (права файла не шире заданных, значение — восьмеричная строка в кавычках: `"640"`).

Для прав файлов используйте `mode_within`, а не `lte`: `604` численно меньше `640`, но шире по правам.
Проба ничего не нашла, а оператор не `exists`/`absent` — статус `error`, а не `fail`
(«нечего сравнивать»).
