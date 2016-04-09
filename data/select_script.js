var text = "";
if(self.options && self.options.text) {
  text = self.options.text;
} else if (document.location.search.indexOf("txt2link=")){
	text = decodeURI(document.location.search.match(/txt2link=.*?&*?$/g).pop().split('=').pop());
}
if(text) {
  window.find(text);
}
