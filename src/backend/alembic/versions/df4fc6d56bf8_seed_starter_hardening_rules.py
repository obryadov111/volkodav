"""seed starter hardening rules

Revision ID: df4fc6d56bf8
Revises: 332ce34492ff
Create Date: 2026-08-30 10:29:35.620122

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df4fc6d56bf8'
down_revision: Union[str, Sequence[str], None] = '332ce34492ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SOURCE = "CIS Benchmark (Ubuntu Linux, адаптировано)"

RULES = [
    # (rule_code, title, expected_value, severity, remediation)
    ("ssh.permit_root_login", "Запрет входа по SSH под root", "no", "critical",
     "В sshd_config установить PermitRootLogin no и перезапустить sshd."),
    ("ssh.password_authentication", "Запрет входа по SSH-паролю (только по ключу)", "no", "high",
     "В sshd_config установить PasswordAuthentication no."),
    ("ssh.permit_empty_passwords", "Запрет пустых паролей по SSH", "no", "critical",
     "В sshd_config установить PermitEmptyPasswords no."),
    ("ssh.x11_forwarding", "Отключить X11-форвардинг по SSH", "no", "low",
     "В sshd_config установить X11Forwarding no."),
    ("ssh.max_auth_tries", "Ограничить число попыток аутентификации SSH", "4", "medium",
     "В sshd_config установить MaxAuthTries 4."),
    ("firewall.ufw_enabled", "Firewall (ufw) активен", "true", "critical",
     "Выполнить `ufw enable` и проверить `ufw status`."),
    ("firewall.default_incoming_policy", "Политика по умолчанию для входящих — deny", "deny", "high",
     "Выполнить `ufw default deny incoming`."),
    ("updates.unattended_upgrades_enabled", "Автоматические обновления безопасности включены", "true", "medium",
     "Установить и настроить unattended-upgrades (`dpkg-reconfigure -plow unattended-upgrades`)."),
    ("password_policy.pass_max_days", "Максимальный срок действия пароля — 90 дней", "90", "medium",
     "В /etc/login.defs установить PASS_MAX_DAYS 90."),
    ("password_policy.pass_min_len", "Минимальная длина пароля — 14 символов", "14", "medium",
     "В /etc/security/pwquality.conf установить minlen=14."),
    ("password_policy.lockout_on_failure", "Блокировка после неудачных попыток входа", "true", "high",
     "Настроить pam_faillock (deny=5, unlock_time=900)."),
    ("kernel.ip_forward", "IP-форвардинг отключён (хост не является роутером)", "0", "low",
     "Установить net.ipv4.ip_forward=0 в /etc/sysctl.conf и применить `sysctl -p`."),
    ("postgres.ssl_enabled", "SSL включён для подключений к PostgreSQL", "true", "high",
     "В postgresql.conf установить ssl = on, перезапустить сервис."),
    ("docker.no_privileged_containers", "Нет контейнеров, запущенных в privileged-режиме", "true", "critical",
     "Убрать флаг --privileged из запуска контейнеров, использовать точечные --cap-add."),
]

rules_table = sa.table(
    "hardening_rules",
    sa.column("rule_code", sa.Text),
    sa.column("title", sa.Text),
    sa.column("description", sa.Text),
    sa.column("expected_value", sa.Text),
    sa.column("source", sa.Text),
    sa.column("severity", sa.Text),
    sa.column("remediation", sa.Text),
)


def upgrade() -> None:
    conn = op.get_bind()
    for rule_code, title, expected_value, severity, remediation in RULES:
        conn.execute(
            sa.text(
                """
                INSERT INTO hardening_rules (rule_code, title, description, expected_value, source, severity, remediation)
                VALUES (:rule_code, :title, :title, :expected_value, :source, :severity, :remediation)
                ON CONFLICT (rule_code) DO NOTHING
                """
            ),
            {
                "rule_code": rule_code,
                "title": title,
                "expected_value": expected_value,
                "source": SOURCE,
                "severity": severity,
                "remediation": remediation,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    codes = [r[0] for r in RULES]
    conn.execute(
        sa.text("DELETE FROM hardening_rules WHERE rule_code = ANY(:codes)"),
        {"codes": codes},
    )
