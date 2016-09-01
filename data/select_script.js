const QSTRING_NAME = 'text-bookmark=';
var qstring = decodeURIComponent(document.location.search);
var text = "";
var endText = "";
var separator = ">>>>>>>";
if(self.options && self.options.text) {
	text = self.options.text;
} else if (qstring.indexOf(QSTRING_NAME) >= 0){
	text = qstring.match(RegExp(QSTRING_NAME + '.*?[^&|^#]*', 'g')).pop().split('=').pop();
}
if(text) {
	if(text.indexOf(separator) >= 0) {
		var tmp = text.split(separator);
		text = tmp[0];
		endText = tmp[1];
	}
	var found = window.find(text, true, false, false, false, false);
	if(found) {
		document.activeElement.focus();
		if(endText) {
			var sel = window.getSelection();
			do {
				sel.modify("extend", "forward", "character");
			} while(!sel.toString().endsWith(endText));
		}
	}
}
