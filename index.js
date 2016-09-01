var clipboard = require("sdk/clipboard");
var cm = require("sdk/context-menu");
var { Hotkey } = require("sdk/hotkeys");
var notifications = require("sdk/notifications");
var pageMod = require("sdk/page-mod");
var selection = require("sdk/selection");
var self = require("sdk/self");
var ss = require("sdk/simple-storage");
var tabs = require('sdk/tabs');
var { setTimeout, clearTimeout } = require("sdk/timers");
var URL = require("sdk/url");
var _ = require("sdk/l10n").get;

var { Cc, Ci, Cu} = require('chrome');
var nsIFilePicker = Ci.nsIFilePicker;
var filePicker = Cc["@mozilla.org/filepicker;1"]
	.createInstance(Ci.nsIFilePicker);
filePicker.appendFilter("Text Bookmarks (*.text-bookmarks)", "*.text-bookmarks");
filePicker.defaultExtension = "text-bookmarks";
filePicker.defaultString = "myTextBookmarks.text-bookmarks";

//add the equals sign here, so i don't have to type it everywhere
const QSTRING_NAME = 'text-bookmark=';
const MAX_QUERY_STRING_VALUE = 30;
const SEPARATOR = ">>>>>>>";

if (!ss.storage.bookmarks) {
	ss.storage.bookmarks  = [];
}

var bookmarksMenu = cm.Menu({
	label: _("bookmarks_submenu"),
	context: cm.PageContext(),
	contentScriptFile: self.data.url('openBookmark_script.js'),
});

function addBookmarksMenuItem(text, url) {
	var label = '';
	if(text.length > 30) {
label = text.slice(0,30) + '...';
	} else {
	label = text;
	}
	bookmarksMenu.addItem(cm.Item({
		label: label,
		data: JSON.stringify({text: text, link: url})
	}));

	pageMod.PageMod({
		include: url,
		contentScriptFile: self.data.url("select_script.js"),
		contentScriptWhen: 'ready',
		contentScriptOptions: {text: text}
	});
}

for (var i=0; i < ss.storage.bookmarks.length; i++) {
	if(ss.storage.bookmarks[i] && (typeof ss.storage.bookmarks[i] == "object") && ss.storage.bookmarks[i].hasOwnProperty('text') && ss.storage.bookmarks[i].hasOwnProperty('link')) {
	addBookmarksMenuItem(ss.storage.bookmarks[i].text, ss.storage.bookmarks[i].link);
	}
}

var addBookmarkItem = cm.Item({
	label: _("add_bookmark_context_default"),
	context: cm.SelectionContext(),
	//This is the only way to get it localized,
	//since context menu content scripts don't support l10n nor the 'contentScriptOptions property
	//otherwise it would have been in the contentScriptFile
	contentScript: 'self.on("context", function () {'+ 
	'if(window.getSelection().toString()) {'+
	'	return ["'+ _("add_bookmark_context") +'", window.getSelection().toString()].join(" ");'+
	'}'+
	'return false;'+
	'});',
	//handling the clicks is here
	contentScriptFile: self.data.url('bookmark_script.js'),
	data: "bookmarkItem",
	onMessage: function(data) {
		do_addBookmark(data.text, data.url);
	}
});

var copyBookmarkItem = cm.Item({
	label: _("copy_bookmark_context_default"),
	context: cm.SelectionContext(),
	//This is the only way to get it localized,
	//since context menu content scripts don't support l10n nor the 'contentScriptOptions property
	//otherwise it would have been in the contentScriptFile
	contentScript: 'self.on("context", function () {'+ 
	'if(window.getSelection().toString()) {'+
	'	return ["'+ _("copy_bookmark_context") +'", window.getSelection().toString()].join(" ");'+
	'}'+
	'return false;'+
	'});',
	//handling the clicks is here
	contentScriptFile: self.data.url('bookmark_script.js'),
	data: "bookmarkItem",
	onMessage: function(data) {
		do_copyBookmarkLink(data.text, data.url);
	}
});


function do_addBookmark(text, url, shouldNotify=true) {
	if(!text) {
		return;
	}
	if(!url || !URL.isValidURI(url)) {
		return;
	}
	//strip our qstring, if present
	url = url.replace(RegExp(QSTRING_NAME + '.*?[^&|^#]*', 'g'), '');

	if(ss.quotaUsage < 1) {
		newLength = ss.storage.bookmarks.push({text: text, link: url});
		manager.port.emit("add", JSON.stringify({id: newLength-1, text: text, link: url}));
	} else {
		notifications.notify({
			title: _("quota_exceeded_notification_title"),
			"text": _("quota_exceeded_notification_text")
		});
		return;
	}
	addBookmarksMenuItem(text, url);
	if(shouldNotify) {
		notifications.notify({
			title: _("added_bookmark_notification_title"),
			"text": text
		});
	}
}

function do_deleteBookmarks(indexArray) {
	//this gymnastics are nesesary, cause when you remove an item, the others shift to the left
	//I could have just reverced the array here though
	var bookmarkMenuItems = [];
	for(index of indexArray) {
		bookmarkMenuItems.push(bookmarksMenu.items[index]);
		//keep the index, so it could be used as an actual index
		ss.storage.bookmarks[index] = false;
	}
	for(bookmarkMenuItem of bookmarkMenuItems.reverse()) {
		bookmarksMenu.removeItem(bookmarkMenuItem );
		bookmarkMenuItem .destroy();
	}
}

pageMod.PageMod({
	include: RegExp('.*'+ QSTRING_NAME +'.*'),
	contentScriptFile: self.data.url("select_script.js"),
	contentScriptWhen: 'ready',
});

var addBookmarkHotKey = Hotkey({
	combo: _("add_bookmark_hotkey"),
	onPress:addBookmarkHotkeyCallback
});

function addBookmarkHotkeyCallback() {
	if ( typeof addBookmarkHotkeyCallback.action == 'undefined' ) {
		addBookmarkHotkeyCallback.action = 0;
	}
	if ( typeof addBookmarkHotkeyCallback.counter == 'undefined' ) {
		addBookmarkHotkeyCallback.counter = 0;
	}
	if(addBookmarkHotkeyCallback.counter == 0){
		addBookmarkHotkeyCallback.action = setTimeout(function() {
			do_addBookmark(selection.text, tabs.activeTab.url);
			addBookmarkHotkeyCallback.counter =0;
			addBookmarkHotkeyCallback.action=0;
		}, 500);
		addBookmarkHotkeyCallback.counter = 1;
	} else if(addBookmarkHotkeyCallback.counter == 1) {
		if(      addBookmarkHotkeyCallback.action) {
			clearTimeout(addBookmarkHotkeyCallback.action);
			addBookmarkHotkeyCallback.action =0;
		}
		addBookmarkHotkeyCallback.counter =0;
		do_copyBookmarkLink(selection.text, tabs.activeTab.url);
	}
}

function do_copyBookmarkLink(text, url) {
	var preparedURL = prepairBookmarkLink(text,url);
	clipboard.set(preparedURL );
	notifications.notify({
		title: _("copied_bookmark_notification_title"),
		"text": preparedURL
	});
}

function prepairBookmarkLink(text, url) {
	var qstring;
	text = text.trim();
	if(text.length > MAX_QUERY_STRING_VALUE) {
		var newLength = MAX_QUERY_STRING_VALUE - SEPARATOR.length;
		var tl = text.length;
		var firstHalfLength = Math.round(newLength/2);
		var secondHalfLength = tl- firstHalfLength;
		text = text.substring(0,firstHalfLength).concat(SEPARATOR, text.substring(secondHalfLength-1));
	}
	qstring = QSTRING_NAME + encodeURIComponent(text);

	if(url.indexOf(QSTRING_NAME) >= 0) {
		url = url.replace(RegExp(QSTRING_NAME + '.*?[^&|^#]*', 'g'), qstring);
	} else {
		var searchIndex = url.indexOf('?');
		var hashIndex = url.indexOf('#');
		var hashValue = '';
		if(hashIndex >= 0) {
			var tmp = url.split('#');
			url = tmp[0];
			hashValue = tmp[1];
		}
		if(searchIndex < 0) {
			url = url.concat('?', qstring);
		} else if(url.indexOf(qstring) < 0) {
			url = url.concat('&', qstring);
		}
		if(hashValue) {
			url = url.concat('#', hashValue);
		}
	}
	return url;
}

//the bookmark manager

var manager = require("sdk/panel").Panel({
	height: 400,
	position: {bottom: 100},
	contentURL: self.data.url("manager.html"),
	contentScriptFile: self.data.url("manager.js"),
	contentScriptWhen: 'ready',
	contentScriptOptions: {bookmarks: ss.storage.bookmarks, l10n: {confirm_delete_start: _("confirm_delete_start"), confirm_delete_end: _("confirm_delete_end")}},
});

var managerMenuitem = cm.Item({
	label: _("manager_menuitem"),
	context: cm.PageContext(),
	contentScriptFile: self.data.url('openManager_script.js'),
	data: "showManager",
	onMessage: function (event) {
		if(event == "showManager") {
			manager.show();
		}
	},
});

manager.on("show", function() {
	manager.port.emit("show");
});

manager.port.on("close", function () {
	manager.hide();
});

manager.port.on('delete', function(data) {
	if(data) {
		var selected = JSON.parse(data);
		if( selected && selected.hasOwnProperty("length") && selected.length) {
			do_deleteBookmarks(selected);
			notifications.notify({
				title: _("bookmarks_deleted_title"),
				text: [_("bookmarks_deleted_text"), selected.length].join(' ')
			});
		}
	}
	manager.show();
});

manager.port.on("import", function () {
	filePicker.init(require("sdk/window/utils").getMostRecentBrowserWindow(),
		_("import_dialog_title"),
		nsIFilePicker.modeOpen);
	filePicker.open({
		done: function(returnValue) {
			if (returnValue == nsIFilePicker.returnOK || returnValue == nsIFilePicker.returnReplace) {
				var file = filePicker.file;

				Cu.import("resource://gre/modules/NetUtil.jsm");

				NetUtil.asyncFetch(file, function(inputStream, status) {
					if (status) {
						return;
					}

					var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
					var parsedData = JSON.parse(data);
					var oldLength = ss.storage.bookmarks.length;

					//pick only the values we need, excluding garbidge
					for(element of parsedData) {
						if(element !== null && typeof element == "object" && element.hasOwnProperty('text') && element.hasOwnProperty('link')) {
							do_addBookmark(element.text, element.link, false);
						}
					} 

					var numberAdded = ss.storage.bookmarks.length - oldLength;
					notifications.notify({
						title: _("notification_bookmarks_imported_title"),
						text: [_("notification_bookmarks_imported_text"), numberAdded].join(' ')
					});
					manager.show();
				});
			}
		},
	});
});

manager.port.on("export", function (selected) {
	filePicker.init(require("sdk/window/utils").getMostRecentBrowserWindow(),
		_("export_dialog_title"),
		nsIFilePicker.modeSave);
	filePicker.open({
		done: function(returnValue) {
			if (returnValue == nsIFilePicker.returnOK || returnValue == nsIFilePicker.returnReplace) {
				var file = filePicker.file;
				var selectedBookmarks = [];
				for(sel of selected) {
					selectedBookmarks.push(ss.storage.bookmarks[sel]);
				}
				var data = JSON.stringify(selectedBookmarks);

				Cu.import("resource://gre/modules/NetUtil.jsm");  
				Cu.import("resource://gre/modules/FileUtils.jsm"); 

				var ostream = FileUtils.openSafeFileOutputStream(file); 
				var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);  
				converter.charset = "UTF-8";  
				var istream = converter.convertToInputStream(data);  

				NetUtil.asyncCopy(istream, ostream, function (status) {     
					notifications.notify({
						title: status===0?_("notification_bookmarks_exported_success"):_("notification_bookmarks_exported_failure"),
						text: [_("notification_bookmarks_exported_text"), file.leafName].join(' ')
					});
					manager.show();
				});  
			}
		},
	});
});

