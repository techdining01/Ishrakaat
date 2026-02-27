from celery import shared_task
from .services import fetch_additional_references


@shared_task
def fetch_additional_references_task():
    fetch_additional_references()

