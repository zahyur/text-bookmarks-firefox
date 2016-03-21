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

if (!ss.storage.bookmarks) {
  ss.storage.bookmarks  = [];
}

var bookmarksMenu = cm.Menu({
  label: "Text Bookmarks",
  context: cm.PageContext(),
  contentScript: 'self.on("click", function (node, data) {' +
      'd = JSON.parse(data);'+
      '  window.location.href = d.link;' +
  '});',
});

for (var i=0; i < ss.storage.bookmarks.length; i++) {
  bookmarksMenu.addItem(cm.Item({
    label: ss.storage.bookmarks[i].text,
    data: ss.storage.bookmarks[i].link
  }));
}

var addBookmarkItem = cm.Item({
  label: "txt2link",
  context: cm.SelectionContext(),
  //contentScriptFile: data.url('addBookmark_script.js'),
  contentScript:  'self.on("context", function () { '+
  'if(window.getSelection().toString()) {'+
    'return "Bookmark "+ window.getSelection().toString();'+
  '}'+
  'return false;'+
'});'+
'self.on("click", function (node, data) {'+
  'console.log("Entering click event");'+
  'if(data != "addBookmarkItem") {'+
    'return;'+
  '}'+
  'var d = {"text": window.getSelection().toString(), "url": document.URL};'+
  'self.postMessage(d);'+
'});',
  data: "addBookmarkItem",
  onMessage: function (data) {
    console.log(data);
    do_addBookmark(data.text, data.url);
  }
});

function do_addBookmark(text, url) {
  if(!text) {
    console.log("do_addBookmark: Text is empty!");
    return;
  }
  if(!url) { // || !URL.isValidURI(url)) {
    console.log("do_addBookmark: URL is empty!");
    return;
  }

  if(ss.quotaUsage < 1) {
    ss.storage.bookmarks.push({text: text, link: url});
  } else {
    alert('Your storage quota is exceeded. You should delete some Text Bookmarks before been able to store more.');
    return;
  }
  notifications.notify({
    title: "Added to bookmarks:",
    "text": text
  });
  bookmarksMenu.addItem(cm.Item({
    label: text,
    data: JSON.stringify({text: text, link: url})
  }));
}

var addBookmarkHotKey = Hotkey({
  combo: "accel-shift-d",
  onPress: function() {
  do_addBookmark(selection.text, tabs.activeTab.url);
  }
});


