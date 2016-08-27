self.on("click", function (node, data) {
	if(data != "bookmarkItem") {
		return;
	}
	var d = {"text": window.getSelection().toString(), "url": document.URL};
	self.postMessage(d);
});

