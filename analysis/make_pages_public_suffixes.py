# Adds a public_suffix column to the pages table

import sys
import os.path
import sqlite3
import re
import urlparse
import publicsuffix

if(len(sys.argv) != 2 or not os.path.isfile(sys.argv[1])):
	print "Usage: python make_pages_public_suffixes.py FOURTHPARTY_DB"
	sys.exit()

dbFileName = sys.argv[1]
dbConnection = sqlite3.connect(dbFileName)
dbConnection.row_factory = sqlite3.Row
dbCursor = dbConnection.cursor()

ipRegex = re.compile(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
psl = publicsuffix.PublicSuffixList()

dbCursor.execute("ALTER TABLE pages ADD public_suffix TEXT")
dbCursor.execute("SELECT id, location FROM pages")
pagesRows = dbCursor.fetchall()
for pagesRow in pagesRows:
	pageID = pagesRow['id']
	pageURL = pagesRow['location']
	pageHostName = urlparse.urlparse(pageURL).hostname
	if pageHostName:
		if ipRegex.match(pageHostName):
			pagePublicSuffix = pageHostName
		else:
			pagePublicSuffix = psl.get_public_suffix(pageHostName)
		dbCursor.execute("UPDATE pages SET public_suffix=? WHERE id=?", (pagePublicSuffix, pageID))

dbConnection.commit()
dbConnection.close()