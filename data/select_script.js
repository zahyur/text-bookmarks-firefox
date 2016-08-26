var text = "";
var endText = "";
var separator = ">>>>>>>";
if(self.options && self.options.text) {
  text = self.options.text;
} else if (document.location.search.indexOf("txt2link=")){
	text = decodeURI(document.location.search.match(/txt2link=.*?[^&|^#]*/g).pop().split('=').pop());
}
if(text) {
  if(text.indexOf(separator)) {
    var tmp = text.split(separator);
    text = tmp[0];
    endText = tmp[1];
  }
  window.find(text);
  if(endText) {
    var sel = window.getSelection();
    do {
      sel.modify("extend", "forward", "character");
    } while(!sel.toString().endsWith(endText));
  }
}
