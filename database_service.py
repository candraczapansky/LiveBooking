import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

class DatabaseService:
    def create_pending_transaction(self, booking_id: str, transaction_id: str, amount: float):
        # Replace with your actual database code (e.g., Firestore)
        logger.info(f"[DB] Creating transaction: {transaction_id} for booking {booking_id} with status PENDING.")
        # Example: firestore_client.collection('transactions').document(transaction_id).set(...)
        pass

    def update_transaction_status(self, transaction_id: str, status: str):
        # Replace with your actual database code (e.g., Firestore)
        logger.info(f"[DB] Updating transaction: {transaction_id} to status {status}.")
        # Example: firestore_client.collection('transactions').document(transaction_id).update({'status': status})
        pass

# This uses FastAPI's dependency injection to ensure we only have one database connection
@lru_cache()
def get_db_service() -> DatabaseService:
    return DatabaseService()
