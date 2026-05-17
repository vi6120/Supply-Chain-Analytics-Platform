"""
DAG 1 — Daily SAP data ingestion
Runs every day at 6am, generates one day of supply chain events
and writes Parquet files to data/raw/
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago

PROJECT_ROOT = "/opt/airflow/supply_chain_pipeline"

default_args = {
    "owner":            "supply_chain_team",
    "retries":          2,
    "retry_delay":      timedelta(minutes=5),
    "email_on_failure": True,
    "email_on_retry":   False,
}

with DAG(
    dag_id="01_daily_sap_ingestion",
    default_args=default_args,
    description="Generate daily SAP supply chain events and write to Parquet",
    schedule_interval="0 6 * * 1-5",   # 6am Monday–Friday
    start_date=days_ago(1),
    catchup=False,
    tags=["ingestion", "sap", "supply_chain"],
) as dag:

    check_environment = BashOperator(
        task_id="check_environment",
        bash_command=f"cd {PROJECT_ROOT} && python3 -c 'import pandas; import duckdb; print(\"Environment OK\")'",
    )

    generate_daily_data = BashOperator(
        task_id="generate_daily_data",
        bash_command=f"cd {PROJECT_ROOT} && python3 scripts/daily_trigger.py --date {{{{ ds }}}}",
        doc_md="""
        Runs daily_trigger.py for the execution date.
        Generates: new POs, goods receipts, sales orders,
        outbound deliveries, and end-of-day stock snapshot.
        {{ ds }} is the Airflow execution date (YYYY-MM-DD).
        """,
    )

    validate_output = BashOperator(
        task_id="validate_output",
        bash_command=f"""
            cd {PROJECT_ROOT} && python3 -c "
import pandas as pd
from pathlib import Path
tables = ['data/raw/mm/ekko.parquet', 'data/raw/wm/mseg.parquet', 'data/raw/sd/vbak.parquet']
for t in tables:
    df = pd.read_parquet(t)
    assert len(df) > 0, f'Empty table: {{t}}'
    print(f'  {{t}}: {{len(df)}} rows — OK')
print('Validation passed')
"
        """,
    )

    check_environment >> generate_daily_data >> validate_output