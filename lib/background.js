var app = {};

app.version = function () {return chrome.runtime.getManifest().version};
app.homepage = function () {return chrome.runtime.getManifest().homepage_url};
app.tab = {"open": function (url) {chrome.tabs.create({"url": url, "active": true})}};
chrome.runtime.setUninstallURL(app.homepage() + "?v=" + app.version() + "&type=uninstall", function () {});

chrome.runtime.onInstalled.addListener(function (e) {
  window.setTimeout(function () {
    var previous = e.previousVersion !== undefined && e.previousVersion !== app.version();
    if (e.reason === "install" || (e.reason === "update" && previous)) {
      var parameter = (e.previousVersion ? "&p=" + e.previousVersion : '') + "&type=" + e.reason;
      app.tab.open(app.homepage() + "?v=" + app.version() + parameter);
    }
  }, 3000);
});

app.button = {
  "click": function (e) {
    if (e.from === "contextmenu") app.button.action();
    else {
      chrome.storage.local.remove("content", app.button.action);
    }
  },
  "init": function (callback) {
    chrome.storage.local.get({"context": "win"}, function (storage) {
      app.UI.url = app.UI.path + '?' + storage.context;
      chrome.browserAction.setPopup({"popup": (storage.context === "popup" ? app.UI.url : '')}, callback);
    });
  },
  "action": function () {
    chrome.storage.local.get({"context": "win"}, function (storage) {
      app.UI.url = app.UI.path + '?' + storage.context;
      if (storage.context === "win") {
        app.UI.id ? chrome.windows.update(app.UI.id, {"focused": true}) : app.UI.create();
      } else if (storage.context === "tab") {
        app.UI.id ? chrome.tabs.update(app.UI.id, {"active": true}) : app.tab.open(app.UI.url);
      } else {}
    });
  }
};

app.contextmenu = {
  "click": function (e) {
    chrome.storage.local.set({"context": e.menuItemId});
    app.UI.url = app.UI.path + '?' + e.menuItemId;
    chrome.browserAction.setPopup({"popup": (e.menuItemId === "popup" ? app.UI.url : '')}, function () {});
  },
  "create": function () {
    chrome.storage.local.get({"context": "win"}, function (storage) {
      var popup = storage.context === "popup", win = storage.context === "win", tab = storage.context === "tab";
      /*  */
      chrome.contextMenus.create({"id": "tab", "type": "radio", "title": "Open in tab",  "contexts": ["browser_action"], "checked": tab, "onclick": app.contextmenu.click});
      chrome.contextMenus.create({"id": "win", "type": "radio", "title": "Open in window",  "contexts": ["browser_action"], "checked": win, "onclick": app.contextmenu.click});
      chrome.contextMenus.create({"id": "popup", "type": "radio", "title": "Open in popup",  "contexts": ["browser_action"], "checked": popup, "onclick": app.contextmenu.click});
      chrome.contextMenus.create({
        "id": "page",
        "title": "Generate QR Code",
        "contexts": ["page", "link", "selection", "editable"],
        "onclick": function (e) {
          if (e.menuItemId === "page") {
            var content = e.linkUrl || e.selectionText || e.pageUrl;
            if (content) {
              chrome.storage.local.set({"content": content}, function () {
                app.button.click({"from": "contextmenu"});
              });
            }
          }
        }
      });
    });
  }
};

app.UI = {
  "url": '',
  "id": null,
  "book": {"url": ''},
  "parent": {"id": null},
  "close": function () {chrome.windows.remove(app.UI.id)},
  "path": chrome.runtime.getURL("data/interface/index.html"),
  "create": function () {
    chrome.storage.local.get({"width": 600, "height": 700}, function (storage) {
      chrome.windows.getCurrent(function (win) {
        app.UI.parent.id = win.id;
        var url = app.UI.url;
        var width = storage.width;
        var height = storage.height;
        var top = win.top + Math.round((win.height - height) / 2);
        var left = win.left + Math.round((win.width - width) / 2);
        chrome.windows.create({'url': url, 'type': 'popup', 'width': width, 'height': height, 'top': top, 'left': left}, function (w) {
          app.UI.id = w.id;
        });
      });
    });
  }
};

app.button.init(app.contextmenu.create);
chrome.tabs.onRemoved.addListener(function (e) {if (e === app.UI.id) {app.UI.id = null}});
chrome.windows.onRemoved.addListener(function (e) {if (e === app.UI.id) {app.UI.id = null}});
chrome.browserAction.onClicked.addListener(function () {app.button.click({"from": "browseraction"})});
chrome.tabs.onCreated.addListener(function (e) {if ((e.url || e.pendingUrl) === app.UI.url) app.UI.id = e.id});
