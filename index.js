const clipboard = require("sdk/clipboard");
var cm = require("sdk/context-menu");
var { Hotkey } = require("sdk/hotkeys");
var notifications = require("sdk/notifications");
var pageMod = require("sdk/page-mod");
var selection = require("sdk/selection");
var self = require("sdk/self");
var ss = require("sdk/simple-storage");
const tabs = require('sdk/tabs');
var { setTimeout, clearTimeout } = require("sdk/timers");
var URL = require("sdk/url");
var _ = require("sdk/l10n").get;

//add the equals sign here, so i don't have to type it everywhere
const QSTRING_NAME = 'txt2link=';
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
	bookmarksMenu.addItem(cm.Item({
		label: text,
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
	addBookmarksMenuItem(ss.storage.bookmarks[i].text, ss.storage.bookmarks[i].link);
}

var addBookmarkItem = cm.Item({
	label: _("add_bookmark_context_default"),
	context: cm.SelectionContext(),
	//This is the only way to get it localized,
	//since context menu content scripts don't support the 'contentScriptOptions property
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
	//since context menu content scripts don't support the 'contentScriptOptions property
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


function do_addBookmark(text, url) {
	if(!text) {
		return;
	}
	if(!url || !URL.isValidURI(url)) {
		return;
	}
	//strip our qstring, if present
	url = url.replace(RegExp(QSTRING_NAME + '.*?[^&|^#]*', 'g'), '');

	if(ss.quotaUsage < 1) {
		ss.storage.bookmarks.push({text: text, link: url});
	} else {
		notifications.notify({
			title: _("quota_exceeded_notification_title"),
			"text": _("quota_exceeded_notification_text")
		});
		return;
	}
	addBookmarksMenuItem(text, url);
	notifications.notify({
		title: _("added_bookmark_notification_title"),
		"text": text
	});
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
