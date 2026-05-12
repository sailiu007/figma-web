from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "atlas",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)
celery_app.conf.task_always_eager = settings.task_always_eager
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.task_default_queue = "atlas.default"
