var self = require("sdk/self");
var data = require("sdk/self").data;
var notifications = require("sdk/notifications");
var selection = require("sdk/selection");
var cm = require("sdk/context-menu");
var ss = require("sdk/simple-storage");
var URL = require("sdk/url");
var querystring= require("sdk/querystring");
var { Hotkey } = require("sdk/hotkeys");
const clipboard = require("sdk/clipboard");
const tabs = require('sdk/tabs');
var pageMod = require("sdk/page-mod");
var { setTimeout, clearTimeout } = require("sdk/timers");
var _ = require("sdk/l10n").get;

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
  label: _("addon_name_short"),
  context: cm.SelectionContext(),
  contentScriptFile: self.data.url('addBookmark_script.js'),
  data: "addBookmarkItem",
  onMessage: function(data) {
    do_addBookmark(data.text, data.url);
  }
});

function do_addBookmark(text, url) {
  if(!text) {
    return;
  }
  if(!url || !URL.isValidURI(url)) {
    return;
  }

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
  include: /.*txt2link=.*/,
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
  if(text.length > MAX_QUERY_STRING_VALUE) {
    var newLength = MAX_QUERY_STRING_VALUE - SEPARATOR.length;
    var tl = text.length;
    var firstHalfLength = Math.round(newLength/2);
    var secondHalfLength = tl- firstHalfLength;
    text = text.substring(0,firstHalfLength).concat(SEPARATOR, text.substring(secondHalfLength-1));
  }
  qstring = 'txt2link='+ querystring.escape(text);
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
  return url;
}
