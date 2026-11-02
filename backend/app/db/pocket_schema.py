from sqlalchemy import inspect, text


def ensure_pocket_subscription_schema(engine):
    inspector = inspect(engine)
    if "jago_pockets" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("jago_pockets")}
    with engine.begin() as connection:
        if "subscription_id" not in columns:
            connection.execute(text(
                "ALTER TABLE jago_pockets ADD COLUMN subscription_id INTEGER "
                "REFERENCES subscriptions(id) ON DELETE RESTRICT"
            ))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_pocket_subscription "
            "ON jago_pockets (user_id, subscription_id)"
        ))
