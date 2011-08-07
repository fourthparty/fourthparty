# Adds a top_id column to the pages table

import sys
import os.path
import sqlite3

if(len(sys.argv) != 2 or not os.path.isfile(sys.argv[1])):
	print "Usage: python make_top_pages.py FOURTHPARTY_DB"
	sys.exit()

dbFileName = sys.argv[1]
dbConnection = sqlite3.connect(dbFileName)
dbConnection.row_factory = sqlite3.Row
dbCursor = dbConnection.cursor()

# Load page and parent IDs
dbCursor.execute("SELECT id, parent_id FROM pages")
pageIdRows = dbCursor.fetchall()
pageIds = []
parentIds = []
pageIdDict = dict()
topPagesDict = dict()
for pageIdRow in pageIdRows:
	pageId = pageIdRow['id']
	parentId = pageIdRow['parent_id']
	pageIds.append(pageId)
	parentIds.append(parentId)
	pageIdDict[pageId] = len(pageIds) - 1

# Traverse IDs to find top pages
for pageId in pageIds:
	lastPage = pageId;
	lastParent = parentIds[pageIdDict[pageId]]
	if lastParent in topPagesDict:
		topPagesDict[pageId] = topPagesDict[lastParent]
	else:
		while lastParent != lastPage:
			lastPage = lastParent
			lastParent = parentIds[pageIdDict[lastPage]]
		topPagesDict[pageId] = lastParent
	
# Update the database with top pages
dbCursor.execute("ALTER TABLE pages ADD top_id INTEGER")

for pageId in pageIds:
	dbCursor.execute("UPDATE pages SET top_id=? WHERE id=?", (topPagesDict[pageId], pageId))

dbConnection.commit()
dbConnection.close()