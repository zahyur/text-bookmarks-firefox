const QSTRING_NAME = 'text-bookmark=';
var qstring = decodeURIComponent(document.location.search);
var text = "";
var endText = "";
var separator = ">>>>>>>";
if(self.options && self.options.text) {
	text = self.options.text;
	//window.find is not perticulary good at finding long text
	//especially containing new lines
	//so brake it here - as a workaround/hack
var hasNewLines = text.indexOf("\n");
	if(hasNewLines >= 0) {
		var lines =  text.split("\n");
text = [lines.shift(), separator, lines.pop()].join('');
	}	
} else if (qstring.indexOf(QSTRING_NAME) >= 0){
	text = qstring.match(RegExp(QSTRING_NAME + '.*?[^&|^#]*', 'g')).pop().split('=').pop();
}
if(text) {
	if(text.indexOf(separator) >= 0) {
		var tmp = text.split(separator);
		text = tmp[0];
		endText = tmp[1];
	}
	var found = window.find(text, true, false, true, false, true, false);
	if(found) {
		document.activeElement.focus();
		if(endText !== '') {
			var sel = window.getSelection();
			//this could be rather slow for long texts
			//but... do you have a better idea?
			do {
				sel.modify("extend", "forward", "character");
			} while(!sel.toString().endsWith(endText));
		}
	}
}
