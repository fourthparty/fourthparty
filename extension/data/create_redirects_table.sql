CREATE TABLE redirects(
	id INTEGER PRIMARY KEY ASC,
	from_channel TEXT,
	to_channel TEXT,
	parent_location TEXT,
	top_location TEXT
);