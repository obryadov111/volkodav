"""Выдать API-ключ агенту-сборщику для организации. Ключ показывается один
раз — сохраняется только его hash (см. app/models/hardening.py:AgentApiKey)."""
from sqlalchemy.orm import Session

from app.core.security import generate_agent_api_key, hash_agent_api_key
from app.db.session import SessionLocal
from app.models.hardening import AgentApiKey
from app.models.organization import ClientOrganization


def main():
    db: Session = SessionLocal()
    try:
        organization_id = input("Organization id: ").strip()
        name = input("Имя ключа (например 'agent-prod'): ").strip() or "agent"

        org = db.query(ClientOrganization).filter(ClientOrganization.id == organization_id).first()
        if not org:
            print("Организация не найдена")
            return

        raw_key = generate_agent_api_key()
        db.add(AgentApiKey(organization_id=organization_id, name=name, key_hash=hash_agent_api_key(raw_key)))
        db.commit()

        print(f"Ключ для организации '{org.name}' создан. Сохраните его — он больше не показывается:")
        print(raw_key)
    finally:
        db.close()


if __name__ == "__main__":
    main()
