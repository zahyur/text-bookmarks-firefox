self.on("click", function (node, data) {
	d = JSON.parse(data);
	window.location.href = d.link;
});
