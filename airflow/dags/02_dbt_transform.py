"""
DAG 2 — dbt transformation pipeline
Triggered after 01_daily_sap_ingestion completes.
Runs dbt build (models + tests) across bronze, silver, and gold layers.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.utils.dates import days_ago

PROJECT_ROOT = "/opt/airflow/supply_chain_pipeline"
DBT_DIR      = f"{PROJECT_ROOT}/transform"

default_args = {
    "owner":            "supply_chain_team",
    "retries":          1,
    "retry_delay":      timedelta(minutes=10),
    "email_on_failure": True,
    "email_on_retry":   False,
}

with DAG(
    dag_id="02_dbt_transform",
    default_args=default_args,
    description="Run dbt transformations after daily ingestion completes",
    schedule_interval="30 6 * * 1-5",  # 6:30am — 30 min after ingestion
    start_date=days_ago(1),
    catchup=False,
    tags=["dbt", "transform", "supply_chain"],
) as dag:

    wait_for_ingestion = ExternalTaskSensor(
        task_id="wait_for_ingestion",
        external_dag_id="01_daily_sap_ingestion",
        external_task_id="validate_output",
        timeout=1800,           # wait up to 30 minutes
        poke_interval=60,
        mode="poke",
        doc_md="Waits for the ingestion DAG to complete before transforming.",
    )

    dbt_run_bronze = BashOperator(
        task_id="dbt_run_bronze",
        bash_command=f"cd {DBT_DIR} && dbt run --select 'bronze_*' --profiles-dir ~/.dbt",
        doc_md="Materialises all 6 bronze views from raw Parquet files.",
    )

    dbt_run_silver = BashOperator(
        task_id="dbt_run_silver",
        bash_command=f"cd {DBT_DIR} && dbt run --select 'silver_*' --profiles-dir ~/.dbt",
        doc_md="Builds silver tables: joined POs, stock movements, sales orders.",
    )

    dbt_run_gold = BashOperator(
        task_id="dbt_run_gold",
        bash_command=f"cd {DBT_DIR} && dbt run --select 'gold_*' --profiles-dir ~/.dbt",
        doc_md="Builds all 7 gold tables: KPIs, reorder alerts, risk scores, financials.",
    )

    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command=f"cd {DBT_DIR} && dbt test --profiles-dir ~/.dbt",
        doc_md="Runs all 28 data quality tests across bronze and silver layers.",
    )

    notify_success = BashOperator(
        task_id="notify_success",
        bash_command="""echo "Pipeline complete: $(date) — gold layer refreshed and all tests passed" """,
    )

    wait_for_ingestion >> dbt_run_bronze >> dbt_run_silver >> dbt_run_gold >> dbt_test >> notify_success