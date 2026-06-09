set projectPath to "/Users/kurtszeluga/hurricane-hearts/manuals/"
set qaPath to "/private/tmp/hh-manuals-qa/"
set documentNames to {"Hurricane-Hearts-User-Manual", "Hurricane-Hearts-Admin-Manual", "Hurricane-Hearts-User-Quick-Reference", "Hurricane-Hearts-Admin-Quick-Reference"}

tell application "Microsoft Word"
	activate
	repeat with documentName in documentNames
		set inputPath to projectPath & documentName & ".docx"
		set outputPath to qaPath & documentName & ".pdf"
		open inputPath
		set manualDocument to active document
		save as manualDocument file name outputPath file format format PDF
		close manualDocument saving no
	end repeat
end tell
