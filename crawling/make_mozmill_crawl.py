# Creates a MozMill crawling script from a template and a list of URLs
# Recommended for use with:
# -mozmill_crawl_template.js
# -Alexa list of top sites, see http://www.alexa.com/topsites

import sys
import os
import string

if len(sys.argv) != 4 or not os.path.isfile(sys.argv[1]) or not os.path.isfile(sys.argv[2]):
	print "Usage: python make_mozmill_crawl.py MOZMILL_TEMPLATE URL_LIST REPEAT_TIMES"
	sys.exit()
	
repeatTimes = int(sys.argv[3])
templateFile = open(sys.argv[1], "r")
beforeRepeatSection = True
inRepeatSection = False
afterRepeatSection = False
beforeRepeatSectionText = ""
repeatSectionText = ""
afterRepeatSectionText = ""
for line in templateFile:
	if beforeRepeatSection:
		if string.find(line, "BEGIN_REPEAT") >= 0:
			beforeRepeatSection = False
			inRepeatSection = True
		else:
			beforeRepeatSectionText += line
	elif inRepeatSection:
		if string.find(line, "END_REPEAT") >= 0:
			inRepeatSection = False
			afterRepeatSection = True
		else:
			repeatSectionText += line
	else:
		afterRepeatSectionText += line

print beforeRepeatSectionText,

urlIndex = 0
for i in range(0, repeatTimes):
	urlFile = open(sys.argv[2], "r")
	for url in urlFile:
		url = string.strip(url)
		if string.find(url, "http") != 0:
			url = "http://" + url
		customRepeatSection = string.replace(repeatSectionText, "URL_NUMBER", str(urlIndex))
		customRepeatSection = string.replace(customRepeatSection, "URL", url)
		print customRepeatSection,
		urlIndex = urlIndex + 1
	urlFile.close()

print afterRepeatSectionText,

templateFile.close()