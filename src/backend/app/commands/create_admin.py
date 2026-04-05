from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def main():
    db: Session = SessionLocal()
    try:
        email = input("Admin email: ").strip().lower()
        password = input("Admin password: ").strip()
        display_name = input("Display name: ").strip()

        exists = db.query(User).filter(User.email == email).first()
        if exists:
            print("Пользователь уже существует")
            return

        user = User(
            email=email,
            password_hash=hash_password(password),
            display_name=display_name or None,
            full_name=display_name or None,
            is_superadmin=True,
            is_active=True,
            account_status="active",
        )
        db.add(user)
        db.commit()
        print(f"Админ создан: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()