"""
RSS Signal Collection Scheduler

Runs RSS aggregation pipeline daily at 6am
Aligns with sales team workflow (fresh signals each morning)
"""

import schedule
import time
import logging
import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

from backend.rss_aggregator import SignalPipeline

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_supabase_client():
    """
    Create and return Supabase client

    Returns:
        Supabase client instance
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        raise ValueError("Missing Supabase credentials in environment variables")

    return create_client(supabase_url, supabase_key)


def run_daily_signal_collection():
    """
    Execute daily RSS signal collection pipeline

    Fetches all feeds, processes signals, stores in database
    """
    logger.info("=" * 60)
    logger.info(f"Starting daily RSS signal collection at {datetime.now()}")
    logger.info("=" * 60)

    try:
        # Initialize Supabase client
        client = get_supabase_client()

        # Run pipeline
        pipeline = SignalPipeline(client)
        result = pipeline.run_pipeline()

        # Log results
        logger.info("Daily signal collection complete:")
        logger.info(f"  - New signals created: {result['processed']}")
        logger.info(f"  - Duplicates merged: {result['duplicates']}")
        logger.info(f"  - Unmatched signals: {result['unmatched']}")
        logger.info(f"  - Errors: {result['errors']}")
        logger.info(f"  - Total feed items: {result['total_fetched']}")

        # Alert if high error rate
        if result['errors'] > result['total_fetched'] * 0.5:
            logger.warning(f"High error rate: {result['errors']}/{result['total_fetched']} items failed")

    except Exception as e:
        logger.error(f"Daily signal collection failed: {e}", exc_info=True)


def run_scheduler():
    """
    Start scheduler daemon

    Runs daily at 6am
    """
    # Schedule daily collection at 6am
    schedule.every().day.at("06:00").do(run_daily_signal_collection)

    logger.info("RSS Scheduler started")
    logger.info("Daily signal collection scheduled for 6:00 AM")
    logger.info("Press Ctrl+C to stop")

    # Run immediately on startup (optional, for testing)
    # run_daily_signal_collection()

    # Keep scheduler running
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
            break
        except Exception as e:
            logger.error(f"Scheduler error: {e}", exc_info=True)
            time.sleep(60)  # Continue after error


def run_once():
    """
    Run pipeline once immediately (for testing/manual execution)

    Usage:
        python -m backend.scheduler --once
    """
    run_daily_signal_collection()


if __name__ == '__main__':
    import sys

    if '--once' in sys.argv:
        # Run once and exit
        run_once()
    else:
        # Start scheduler daemon
        run_scheduler()
