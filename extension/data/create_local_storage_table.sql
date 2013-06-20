CREATE TABLE local_storage(
	id INTEGER PRIMARY KEY ASC,
	scope TEXT,
	key TEXT,
	value TEXT,
	secure INTEGER,
	owner TEXT
);