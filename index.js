var self = require("sdk/self");
var data = require("sdk/self").data;
var notifications = require("sdk/notifications");
var selection = require("sdk/selection");
var cm = require("sdk/context-menu");
var ss = require("sdk/simple-storage");
var URL = require("sdk/url");
var { Hotkey } = require("sdk/hotkeys");
const clipboard = require("sdk/clipboard");
const tabs = require('sdk/tabs');
var pageMod = require("sdk/page-mod");
var _ = require("sdk/l10n").get;

if (!ss.storage.bookmarks) {
  ss.storage.bookmarks  = [];
}

var bookmarksMenu = cm.Menu({
  label: _("bookmarks_submenu"),
  context: cm.PageContext(),
  contentScript: 'self.on("click", function (node, data) {' +
      'd = JSON.parse(data);'+
      '  window.location.href = d.link;' +
  '});',
});

function addBookmarksMenuItem(text, url) {
  bookmarksMenu.addItem(cm.Item({
    label: text,
    data: JSON.stringify({text: text, link: url})
  }));
  pageMod.PageMod({
    include: url,
    contentScriptFile: self.data.url("select_script.js"),
    contentScriptOptions: {text: text}
  });
}

for (var i=0; i < ss.storage.bookmarks.length; i++) {
  addBookmarksMenuItem(ss.storage.bookmarks[i].text, ss.storage.bookmarks[i].link);
}

var addBookmarkItem = cm.Item({
  label: _("addon_name_short"),
  context: cm.SelectionContext(),
  contentScript:  'self.on("context", function () { '+
  'if(window.getSelection().toString()) {'+
    'return "'+ _("add_bookmark_context") +' "+ window.getSelection().toString();'+
  '}'+
  'return false;'+
'});'+
'self.on("click", function (node, data) {'+
  'if(data != "addBookmarkItem") {'+
    'return;'+
  '}'+
  'var d = {"text": window.getSelection().toString(), "url": document.URL};'+
  'self.postMessage(d);'+
'});',
  data: "addBookmarkItem",
  onMessage: function (data) {
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

var addBookmarkHotKey = Hotkey({
  combo: _("add_bookmark_hotkey"),
  onPress: function() {
  do_addBookmark(selection.text, tabs.activeTab.url);
  }
});


