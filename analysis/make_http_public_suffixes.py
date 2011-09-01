# Adds a public_suffix column to the http_requests and http_responses tables

import sys
import os.path
import sqlite3
import re
import urlparse
import publicsuffix

if(len(sys.argv) != 2 or not os.path.isfile(sys.argv[1])):
	print "Usage: python make_http_public_suffixes.py FOURTHPARTY_DB"
	sys.exit()

dbFileName = sys.argv[1]
dbConnection = sqlite3.connect(dbFileName)
dbConnection.row_factory = sqlite3.Row
dbCursor = dbConnection.cursor()

ipRegex = re.compile(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
psl = publicsuffix.PublicSuffixList()

dbCursor.execute("ALTER TABLE http_requests ADD public_suffix TEXT")
dbCursor.execute("SELECT id, url FROM http_requests")
httpRequestRows = dbCursor.fetchall()
for httpRequestRow in httpRequestRows:
	httpRequestId = httpRequestRow['id']
	httpRequestURL = httpRequestRow['url']
	httpRequestHostName = urlparse.urlparse(httpRequestURL).hostname
	if ipRegex.match(httpRequestHostName):
		httpRequestPublicSuffix = httpRequestHostName
	else:
		httpRequestPublicSuffix = psl.get_public_suffix(httpRequestHostName)
	dbCursor.execute("UPDATE http_requests SET public_suffix=? WHERE id=?", (httpRequestPublicSuffix, httpRequestId))

dbCursor.execute("ALTER TABLE http_responses ADD public_suffix TEXT")
dbCursor.execute("SELECT id, url FROM http_responses")
httpResponseRows = dbCursor.fetchall()
for httpResponseRow in httpResponseRows:
	httpResponseId = httpResponseRow['id']
	httpResponseURL = httpResponseRow['url']
	httpResponseHostName = urlparse.urlparse(httpResponseURL).hostname
	if ipRegex.match(httpResponseHostName):
		httpRequestPublicSuffix = httpResponseHostName
	else:
		httpResponsePublicSuffix = psl.get_public_suffix(httpResponseHostName)
	dbCursor.execute("UPDATE http_responses SET public_suffix=? WHERE id=?", (httpResponsePublicSuffix, httpResponseId))

dbConnection.commit()
dbConnection.close()