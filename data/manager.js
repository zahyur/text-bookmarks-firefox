var bookmarksSelect = document.getElementById("bookmarks");
var selectAllButton = document.getElementById("select-all");
var selectNoneButton = document.getElementById("select-none");
var deleteButton = document.getElementById("delete");
var importButton = document.getElementById("import");
var exportButton = document.getElementById("export");
var closeButton = document.getElementById("close");

var l10n = {};
var 	bookmarks = [];
if(self.options) {
	if(self.options.l10n) {
		l10n = self.options.l10n;
	}
	if(self.options.bookmarks) {
		bookmarks = self.options.bookmarks;
	}
}

var addBookmark = function(text, link) {
	var opt = document.createElement("option");
	var label = '';
	if(text.length > 30) {
		label = text.slice(0,30) + '...';
	} else {
		var spaces = '';
		var count = 30 - text.length;
		for( var i=0; i<count; i++) {
			spaces += '&nbsp;';
		}
		label = text + spaces;
	}
	opt.value= text;
	opt.innerHTML = [label, link.replace(/http.?:\/\/([^\/]+)\//, '$1').slice(0,30)].join("\t");
	bookmarksSelect.appendChild(opt);
}


var updateTitle = function() {
	var label = document.getElementById('bookmarks-label');
	var parts = document.title.split(' ');
	if(parts[parts.length-1].search(/\(\d+\)/g) >= 0) {
		parts[parts.length-1] = parts[parts.length-1].replace(/\d+/, bookmarksSelect.options.length);
	} else {
		parts.push("("+ bookmarksSelect.options.length +")");
	}
	label.innerHTML = document.title = parts.join(' ');
}


var getSelectedBookmarks = function() {
	var selected = [];
	for(var i=0; i < bookmarksSelect.options.length; i++) {
		if(bookmarksSelect.options[i].selected === true) {
			selected.push(i);
		}
	}
	return selected;
}


for(var i=0; i < bookmarks.length; i++) {
	if(bookmarks[i] && (typeof bookmarks[i] == "object") && bookmarks[i].hasOwnProperty('text') && bookmarks[i].hasOwnProperty('link')) {
		addBookmark(bookmarks[i].text, bookmarks[i].link);
	}
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
	addBookmark(bookmark.text, bookmark.link);
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
	event.preventDefault();
});

selectNoneButton.addEventListener('click', function onclick(event) {
	for(var i=0; i < bookmarksSelect.options.length; i++) {
		bookmarksSelect.options[i].selected = false;
	}
	event.preventDefault();
});

deleteButton.addEventListener('click', function onclick(event) {
	var selected = getSelectedBookmarks();
	//this confirm check is here, cause it'd have to jump one additional time
	//between this script and the main script if it was there.
	if(selected.length && confirm([l10n.confirm_delete_start, selected.length, l10n.confirm_delete_end].join(' '))) {
		self.port.emit("delete", JSON.stringify(selected));
		for(sel of selected.reverse()) {
			bookmarksSelect.options.splice(sel,1);
		}
	} else {
		//this is here to cause the main script to reopen the Manager
		//it's closed because of the openned confirm dialog, so preventDefault() doesn't help us.
		self.port.emit("delete", '');
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

