from sqlalchemy import select
from sqlalchemy.orm import Session

from app.persistence.audit_logs.model import AuditLog


def list_audit_logs(db: Session) -> list[AuditLog]:
    return list(db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc())))


def get_audit_log(db: Session, audit_log_id: str) -> AuditLog | None:
    return db.scalar(select(AuditLog).where(AuditLog.id == audit_log_id))


def add_audit_log(db: Session, audit_log: AuditLog) -> AuditLog:
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
