set inputPath to "/Users/kurtszeluga/hurricane-hearts/manuals/Hurricane-Hearts-Newsletter-Advertisement.docx"
set outputPath to "/Users/kurtszeluga/hurricane-hearts/manuals/Hurricane-Hearts-Newsletter-Advertisement.pdf"

tell application "Microsoft Word"
	activate
	open inputPath
	save as active document file name outputPath file format format PDF
	close active document saving no
end tell
