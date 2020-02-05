var config = {
  "timeout": {},
  "elements": {},
  "context": {
    "app": window !== window.top,
    "extension": window === window.top,
    "win": document.location.href.indexOf("win") !== -1,
    "popup": document.location.href.indexOf("popup") !== -1
  },
  "addon": {
    "version": function () {return chrome && chrome.runtime ? chrome.runtime.getManifest().version : ''},
    "homepage": function () {return chrome && chrome.runtime ? chrome.runtime.getManifest().homepage_url : ''}
  },
  "load": function () {
    config.elements.svg = document.querySelector(".qrcode-svg");
    config.elements.text = document.querySelector(".qrcode-text");
    config.elements.items = document.querySelector(".sidebar #items");
    /*  */
    config.elements.text.querySelector("input").addEventListener("click", function () {
      config.app.generate.qrcode.svg();
    });
    /*  */
    config.elements.text.querySelector("textarea").addEventListener("change", function () {
      config.elements.text.querySelector("input").click();
    });
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "storage": {
    "id": '',
    "local": {},
    "read": function (id) {return config.storage.local[id + config.storage.id]},
    "load": function (callback) {
      if (config.context.extension) {
        chrome.storage.local.get(null, function (e) {
          config.storage.local = e;
          callback();
        });
      } else {
        config.storage.id = window.top.location.pathname.replace(/\//g, '');
        var keys = Object.keys(localStorage);
        var i = keys.length;
        while (i--) {
          if (keys[i]) {
            var item = localStorage.getItem(keys[i]);
            if (item) {
              try {
                config.storage.local[keys[i]] = JSON.parse(item);
              } catch (e) {
                config.storage.local[keys[i]] = item;
              }
            }
          }
        }
        callback();
      }
    },
    "write": function (id, data) {
      if (id) {
        id = id + config.storage.id;
        if (data !== '' && data !== null && data !== undefined) {
          var tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          if (config.context.extension) {
            chrome.storage.local.set(tmp, function () {});
          } else {
            localStorage.setItem(id, JSON.stringify(data));
          }
        } else {
          delete config.storage.local[id];
          if (config.context.extension) {
            chrome.storage.local.remove(id, function () {});
          } else {
            localStorage.removeItem(id);
          }
        }
      }
    }
  },
  "app": {
    "prefs": {
      set time (val) {config.storage.write("time", val)},
      set reload (val) {config.storage.write("reload", val)},
      get time () {return config.storage.read("time") !== undefined ? config.storage.read("time") : true},
      get reload () {return config.storage.read("reload") !== undefined ? config.storage.read("reload") : true},
      "qrcode": {
        set index (val) {config.storage.write("index", val)},
        set contents (val) {config.storage.write("contents", val)},
        get index () {return config.storage.read("index") !== undefined ? config.storage.read("index") : 0},
        get contents () {return config.storage.read("contents") !== undefined ? config.storage.read("contents") : []}
      }
    },
    "start": function () {
      config.app.listeners.click.add();
      config.app.render.all.qrcode.items();
      config.app.render.last.qrcode.item();
      /*  */
      var context = document.location.search ? document.location.search.replace('?', '') : "app";
      document.documentElement.setAttribute("context", context);
      /*  */
      window.setInterval(config.app.time.update, 1000);
    },
    "make": {
      "download": {
        "url": function (content) {
          if (content) {
            var a = document.querySelector(".download").querySelector("a");
            if (a) {
              var href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(content);
              a.href = href;
            }
          }
        }
      },
    },
    "time": {
      "update": function () {
        var now = new Date();
        /*  */
        const date = document.getElementById("date");
        const time = document.getElementById("time");
        const format = (s) => {return ("00" + s).substr(-2)};
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        /*  */
        date.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + format(now.getDate());
        time.textContent = format(now.getHours()) + ':' + format(now.getMinutes()) + ':' + format(now.getSeconds());
      }
    },
    "generate": {
      "qrcode": {
        "svg": function () {
          var content = config.elements.text.querySelector("textarea").value;
          if (content) {
            var parser = new DOMParser();
            var output = new QRCode({
              "join": true,
              "padding": 1,
              "color": "#333",
              "content": content,
              "background": "#FFFFFF",
              "container": "svg-viewbox"
            });
            /*  */
            config.elements.svg.textContent = '';
            config.app.make.download.url(output.svg());
            var parsed = parser.parseFromString(output.svg(), "application/xml");
            config.elements.svg.appendChild(parsed.querySelector("svg"));
            /*  */
            var tmp = config.app.prefs.qrcode.contents;
            if (tmp.indexOf(content) === -1) {
              tmp.push(content);
              if (tmp.length > 10) tmp.shift();
              config.app.prefs.qrcode.contents = tmp;
              config.app.render.all.qrcode.items();
            }
            /*  */
            [...config.elements.items.querySelectorAll(".qrcode")].map(function (item) {
              var i = item.getAttribute("index");
              var a = item.getAttribute("content");
              var b = config.elements.text.querySelector("textarea").value;
              if (a === b) {
                item.setAttribute("active", '');
                config.app.prefs.qrcode.index = parseInt(i);
              } else {
                item.removeAttribute("active");
              }
            });
          }
        }
      }
    },
    "listeners": {
      "click": {
        "for": {
          "close": function (e) {
            var tmp = config.app.prefs.qrcode.contents;
            var index = parseInt(e.target.getAttribute("index"));
            tmp.splice(index, 1);
            config.app.prefs.qrcode.contents = tmp;
            config.app.render.all.qrcode.items();
          },
          "svg": function (e) {
            var parent = e.target.closest("div");
            var index = parent.getAttribute("index");
            var content = parent.getAttribute("content");
            if (content) {
              config.elements.text.querySelector("textarea").value = content;
              config.app.prefs.qrcode.index = parseInt(index);
              config.app.generate.qrcode.svg();
            }
          }
        },
        "add": function () {
          var reload = document.querySelector(".reload");
          var footer = document.querySelector(".footer");
          var support = document.querySelector(".support");
          var donation = document.querySelector(".donation");
          var datetime = document.getElementById("datetime");
          var showreload = document.getElementById("showreload");
          /*  */
          datetime.checked = config.app.prefs.time;
          showreload.checked = config.app.prefs.reload;
          footer.style.display = config.app.prefs.time ? "block" : "none";
          reload.style.display = config.app.prefs.reload ? "block" : "none";
          /*  */
          reload.addEventListener("click", function () {
            document.location.reload();
          });
          /*  */
          showreload.addEventListener("change", function (e) {
            config.app.prefs.reload = e.target.checked;
            reload.style.display = e.target.checked ? "block" : "none";
          });
          /*  */
          datetime.addEventListener("change", function (e) {
            config.app.prefs.time = e.target.checked;
            footer.style.display = e.target.checked ? "block" : "none";
          });
          /*  */
          support.addEventListener("click", function () {
            var url = config.addon.homepage();
            if (config.context.extension) {
              chrome.tabs.create({"url": url, "active": true});
            }
          }, false);
          /*  */
          donation.addEventListener("click", function () {
            var url = config.addon.homepage() + "?reason=support";
            if (config.context.extension) {
              chrome.tabs.create({"url": url, "active": true});
            }
          }, false);
        }
      }
    },
    "render": {
      "all": {
        "qrcode": {
          "items": function () {
            [...config.elements.items.querySelectorAll(".qrcode")].map(function (e) {e.remove()});
            /*  */
            var items = config.app.prefs.qrcode.contents;
            if (items && items.length) {
              for (var i = 0; i < items.length; i++) {
                var content = items[i];
                if (content) {
                  var item = config.app.render.current.qrcode.item(i, content);
                  config.elements.items.appendChild(item);
                }
              }
            }
          }
        }
      },
      "last": {
        "qrcode": {
          "item": function () {
            var content = config.storage.read("content");
            if (content) {
              config.elements.text.querySelector("textarea").value = content;
              config.elements.text.querySelector("input").click();
            } else {
              var items = [...config.elements.items.querySelectorAll(".qrcode")];
              if (items && items.length) {
                items.map(function (item) {
                  var index = item.getAttribute("index");
                  if (index !== undefined) {
                    var a = parseInt(index);
                    var b = config.app.prefs.qrcode.index;
                    if (a === b) {
                      var label = item.querySelector("label");
                      if (label) label.click();
                    }
                  }
                });
              } else {
                config.elements.text.querySelector("textarea").value = "Sample QR Code";
                config.elements.text.querySelector("input").click();
              }
            }
          }
        }
      },
      "current": {
        "qrcode": {
          "item": function (index, content) {
            var div = document.createElement("div");
            /*  */
            var thumbnail = new QRCode({
              "join": true,
              "padding": 1,
              "color": "#333",
              "content": content,
              "container": "svg-viewbox",
              "background": "transparent"
            });
            /*  */
            var parsed = (new DOMParser()).parseFromString(thumbnail.svg(), "application/xml");
            var svg = parsed.querySelector("svg");
            svg.addEventListener("click", config.app.listeners.click.for.svg, false);
            div.appendChild(svg);
            /*  */
            var label = document.createElement("label");
            label.textContent = content;
            label.addEventListener("click", config.app.listeners.click.for.svg, false);
            div.appendChild(label);
            /*  */
            var input = document.createElement("input");
            input.value = '✕';
            input.setAttribute("index", index);
            input.setAttribute("type", "button");
            input.addEventListener("click", config.app.listeners.click.for.close);
            div.appendChild(input);
            /*  */
            div.setAttribute("index", index);
            div.setAttribute("content", content);
            div.setAttribute("class", "item qrcode");
            /*  */
            return div;
          }
        }
      }
    }
  }
};

document.addEventListener("DOMContentLoaded", function () {
  var support = document.querySelector(".support");
  var donation = document.querySelector(".donation");
  if (support) support.style.display = config.context.extension ? "table-cell" : "none";
  if (donation) donation.style.display = config.context.extension ? "table-cell" : "none";
});

window.addEventListener("resize", function () {
  var context = document.documentElement.getAttribute("context");
  if (context === "win") {
    if (config.timeout.resize) window.clearTimeout(config.timeout.resize);
    config.timeout.resize = window.setTimeout(function () {
      config.storage.write("width", window.innerWidth || window.outerWidth);
      config.storage.write("height", window.innerHeight || window.outerHeight);
    }, 1000);
  }
}, false);

window.addEventListener("click", function (e) {
  var div = e.target.closest("div");
  if (div) {
    var key = div.getAttribute("class");
    if (key && key.indexOf("qrcode-") !== -1) {
      var btn = document.getElementById("btn");
      if (btn) {
        var state = btn.getAttribute("class");
        if (state && state === "active") {
          btn.click();
        }
      }
    }
  }
}, false);

if (config.context.popup) {
  document.body.style.width = "500px";
  document.body.style.height = "520px";
}

if (config.context.win) {
  window.addEventListener("focus", function () {
    config.storage.load(function () {
      config.app.render.last.qrcode.item();
    });
  });
}

window.addEventListener("load", config.load, false);
