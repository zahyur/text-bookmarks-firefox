var bookmarksSelect = document.getElementById("bookmarks");
var selectAllButton = document.getElementById("select-all");
var selectNoneButton = document.getElementById("select-none");
var deleteButton = document.getElementById("delete");
var importButton = document.getElementById("import");
var exportButton = document.getElementById("export");
var closeButton = document.getElementById("close");

	bookmarks = [];
	if(self.options && self.options.bookmarks) {
bookmarks = self.options.bookmarks;
	}
for(var i=0; i < bookmarks.length; i++) {
   var opt = document.createElement("option");
   opt.value= i;
   opt.innerHTML = [bookmarks[i].text, bookmarks[i].link].join("\t");
   bookmarksSelect.appendChild(opt);
}

function updateTitle() {
var parts = document.title.split(' ');
if(parts[parts.length-1].search(/\(\d+\)/g) >= 0) {
parts[parts.length-1] = parts[parts.length-1].replace(/\d+/, bookmarksSelect.options.length);
} else {
parts.push("("+ bookmarksSelect.options.length +")");
}
document.title = parts.join(' ');
}

function getSelectedBookmarks() {
	var selected = [];
	for(var i=0; i < bookmarksSelect.options.length; i++) {
		if(bookmarksSelect.options[i].selected === true) {
selected.push(bookmarksSelect.options[i].value);
		}
	}
	return selected;
}

self.port.on("show", function () {
	updateTitle();
	bookmarksSelect.focus();
});
bookmarksSelect.addEventListener("change", function(evt) {
	updateTitle();
});
self.port.on("add", function (data) {
	bookmark = JSON.parse(data);
   var opt = document.createElement("option");
   opt.value= bookmark.id;
   opt.innerHTML = [bookmark.text, bookmark.link].join("\t");
   bookmarksSelect.appendChild(opt);
});
document.addEventListener('keyup', function (event) {
	if (event.keyCode == 27) {
		self.port.emit("close");
	}
});
closeButton.addEventListener('click', function onclick(event) {
	self.port.emit("close");
});
selectAllButton.addEventListener('click', function onclick(event) {
	for(var i=0; i < bookmarksSelect.options.length; i++) {
bookmarksSelect.options[i].selected = true;
	}
});
selectNoneButton.addEventListener('click', function onclick(event) {
	for(var i=0; i < bookmarksSelect.options.length; i++) {
bookmarksSelect.options[i].selected = false;
	}
});
deleteButton.addEventListener('click', function onclick(event) {
	var selected = getSelectedBookmarks();
	if((selected.length > 0) && confirm("Are you sure you want to delete these "+ selected.length +" bookmarks?")) {
	self.port.emit("delete", JSON.stringify(selected));
		for(sel of selected.reverse()) {
bookmarksSelect.options[sel] = null;
		}
	}
	bookmarksSelect.focus();
});
importButton.addEventListener('click', function onclick(event) {
	self.port.emit("import");
	bookmarksSelect.focus();
});
exportButton.addEventListener('click', function onclick(event) {
	self.port.emit("export", JSON.stringify(getSelectedBookmarks()));
	bookmarksSelect.focus();
});
