self.on("context", function () { 
	if(window.getSelection().toString()) {
		return "Bookmark "+ window.getSelection().toString();
	}
	return false;
});
self.on("click", function (node, data) {
	if(data != "addBookmarkItem") {
		return;
	}
	var d = {"text": window.getSelection().toString(), "url": document.URL};
	self.postMessage(d);
});

