var background = (function () {
  let tmp = {};
  let context = document.documentElement.getAttribute("context");
  if (context === "webapp") {
    return {
      "send": function () {},
      "receive": function (callback) {}
    }
  } else {
    chrome.runtime.onMessage.addListener(function (request) {
      for (let id in tmp) {
        if (tmp[id] && (typeof tmp[id] === "function")) {
          if (request.path === "background-to-interface") {
            if (request.method === id) tmp[id](request.data);
          }
        }
      }
    });
    /*  */
    return {
      "receive": function (id, callback) {
        tmp[id] = callback;
      },
      "send": function (id, data) {
        chrome.runtime.sendMessage({
          "data": data,
          "method": id, 
          "path": "interface-to-background"
        }, function () {
          return chrome.runtime.lastError;
        });
      }
    }
  }
})();

var config = {
  "timeout": {},
  "elements": {},
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
      config.resize.timeout = window.setTimeout(function () {
        config.storage.write("size", {
          "width": window.innerWidth || window.outerWidth,
          "height": window.innerHeight || window.outerHeight
        });
      }, 1000);
    }
  },
  "load": function () {
    config.elements.svg = document.querySelector(".qrcode-svg");
    config.elements.text = document.querySelector(".qrcode-text");
    config.elements.items = document.querySelector(".sidebar #items");
    /*  */
    const input = config.elements.text.querySelector("input");
    if (input) {
      input.addEventListener("click", function () {
        config.app.generate.qrcode.svg();
      });
    }
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          let tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp);
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id);
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      const context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.body.style.width = "500px";
              document.body.style.height = "520px";
            }
            /*  */
            chrome.runtime.connect({
              "name": config.port.name
            });
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "app": {
    "prefs": {
      set time (val) {config.storage.write("time", val)},
      set theme (val) {config.storage.write("theme", val)},
      set realtime (val) {config.storage.write("realtime", val)},
      get time () {return config.storage.read("time") !== undefined ? config.storage.read("time") : true},
      get theme () {return config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light"},
      get realtime () {return config.storage.read("realtime") !== undefined ? config.storage.read("realtime") : false},
      "qrcode": {
        set index (val) {config.storage.write("index", val)},
        set contents (val) {config.storage.write("contents", val)},
        get index () {return config.storage.read("index") !== undefined ? config.storage.read("index") : 0},
        get contents () {return config.storage.read("contents") !== undefined ? config.storage.read("contents") : []}
      }
    },
    "time": {
      "update": function () {
        const now = document.getElementById("now");
        /*  */
        now.textContent = new Intl.DateTimeFormat("en-US", {
          "timeStyle": "medium",
          "dateStyle": "medium"
        }).format();
      }
    },
    "make": {
      "download": {
        "url": function (content) {
          if (content) {
            const download = document.querySelector(".download");
            if (download) {
              const a = download.querySelector('a');
              if (a) {
                const href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(content);
                a.href = href;
              }
            }
          }
        }
      }
    },
    "start": function () {
      config.app.listeners.click.add();
      config.app.listeners.textarea.add();
      config.app.render.all.qrcode.items();
      config.app.render.last.qrcode.item();
      /*  */
      const theme = config.app.prefs.theme;
      const context = document.documentElement.getAttribute("context");
      document.documentElement.setAttribute("theme", theme !== undefined ? theme : "light");
      /*  */
      if (context === "win") {
        window.addEventListener("focus", function () {
          config.storage.load(function () {
            config.app.render.last.qrcode.item();
          });
        });
      }
      /*  */
      window.setInterval(config.app.time.update, 1000);
    },
    "generate": {
      "qrcode": {
        "svg": function () {
          const content = config.elements.text.querySelector("textarea").value;
          if (content) {
            const parser = new DOMParser();
            const output = new QRCode({
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
            const parsed = parser.parseFromString(output.svg(), "application/xml");
            config.elements.svg.appendChild(parsed.querySelector("svg"));
            /*  */
            const tmp = config.app.prefs.qrcode.contents;
            if (tmp.indexOf(content) === -1) {
              tmp.push(content);
              if (tmp.length > 15) tmp.shift();
              config.app.prefs.qrcode.contents = tmp;
              config.app.render.all.qrcode.items();
            }
            /*  */
            [...config.elements.items.querySelectorAll(".qrcode")].map(function (item) {
              const i = item.getAttribute("index");
              const a = item.getAttribute("content");
              const b = config.elements.text.querySelector("textarea").value;
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
      "textarea": {
        "add": function () {
          const textarea = config.elements.text.querySelector("textarea");
          if (textarea) {
            if (config.app.prefs.realtime) {
              textarea.addEventListener("input", config.app.generate.qrcode.svg);
              textarea.removeEventListener("change", config.app.generate.qrcode.svg);
            } else {
              textarea.addEventListener("change", config.app.generate.qrcode.svg);
              textarea.removeEventListener("input", config.app.generate.qrcode.svg);
            }
          }
        }
      },
      "click": {
        "for": {
          "close": function (e) {
            const tmp = config.app.prefs.qrcode.contents;
            const index = parseInt(e.target.getAttribute("index"));
            tmp.splice(index, 1);
            config.app.prefs.qrcode.contents = tmp;
            config.app.render.all.qrcode.items();
          },
          "svg": function (e) {
            const parent = e.target.closest("div");
            const index = parent.getAttribute("index");
            const content = parent.getAttribute("content");
            if (content) {
              config.elements.text.querySelector("textarea").value = content;
              config.app.prefs.qrcode.index = parseInt(index);
              config.app.generate.qrcode.svg();
            }
          },
          "btn": function (e) {
            const div = e.target.closest("div");
            if (div) {
              const key = div.getAttribute("class");
              if (key && key.indexOf("qrcode-") !== -1) {
                const btn = document.getElementById("btn");
                if (btn) {
                  const state = btn.getAttribute("class");
                  if (state && state === "active") {
                    btn.click();
                  }
                }
              }
            }
          }
        },
        "add": function () {
          const theme = document.getElementById("theme");
          const footer = document.querySelector(".footer");
          const reload = document.getElementById("reload");
          const support = document.getElementById("support");
          const download = document.querySelector(".download");
          const donation = document.getElementById("donation");
          const datetime = document.getElementById("datetime");
          const realtime = document.getElementById("realtime");
          /*  */
          datetime.checked = config.app.prefs.time;
          realtime.checked = config.app.prefs.realtime;
          footer.style.display = config.app.prefs.time ? "block" : "none";
          /*  */
          reload.addEventListener("click", function () {
            document.location.reload();
          });
          /*  */
          realtime.addEventListener("change", function (e) {
            config.app.prefs.realtime = e.target.checked;
            config.app.listeners.textarea.add();
          });
          /*  */
          datetime.addEventListener("change", function (e) {
            config.app.prefs.time = e.target.checked;
            footer.style.display = e.target.checked ? "block" : "none";
          });
          /*  */
          support.addEventListener("click", function () {
            const url = config.addon.homepage();
            chrome.tabs.create({"url": url, "active": true});
          }, false);
          /*  */
          donation.addEventListener("click", function () {
            const url = config.addon.homepage() + "?reason=support";
            chrome.tabs.create({"url": url, "active": true});
          }, false);
          /*  */
          theme.addEventListener("click", function () {
            let attribute = document.documentElement.getAttribute("theme");
            attribute = attribute === "dark" ? "light" : "dark";
            /*  */
            document.documentElement.setAttribute("theme", attribute);
            config.app.prefs.theme = attribute;
          }, false);
          /*  */
          download.addEventListener("click", function (e) {
            const a = e.target.querySelector('a');
            if (a) {
              if (a.href) {
                a.click();
                /*  */
                e.preventDefault();
                e.stopPropagation();
              }
            }
          });
        }
      }
    },
    "render": {
      "all": {
        "qrcode": {
          "items": function () {
            [...config.elements.items.querySelectorAll(".qrcode")].map(function (e) {e.remove()});
            /*  */
            const items = config.app.prefs.qrcode.contents;
            if (items && items.length) {
              for (let i = 0; i < items.length; i++) {
                const content = items[i];
                if (content) {
                  const item = config.app.render.current.qrcode.item(i, content);
                  config.elements.items.querySelector(".history").appendChild(item);
                }
              }
            }
          }
        }
      },
      "last": {
        "qrcode": {
          "item": function () {
            const content = config.storage.read("content");
            if (content) {
              config.elements.text.querySelector("textarea").value = content;
              config.elements.text.querySelector("input").click();
            } else {
              const items = [...config.elements.items.querySelectorAll(".qrcode")];
              if (items && items.length) {
                items.map(function (item) {
                  const index = item.getAttribute("index");
                  if (index !== undefined) {
                    const a = parseInt(index);
                    const b = config.app.prefs.qrcode.index;
                    if (a === b) {
                      const label = item.querySelector("label");
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
            const div = document.createElement("div");
            /*  */
            const thumbnail = new QRCode({
              "join": true,
              "padding": 1,
              "color": "#333",
              "content": content,
              "container": "svg-viewbox",
              "background": "transparent"
            });
            /*  */
            const parsed = (new DOMParser()).parseFromString(thumbnail.svg(), "application/xml");
            const svg = parsed.querySelector("svg");
            svg.addEventListener("click", config.app.listeners.click.for.svg, false);
            div.appendChild(svg);
            /*  */
            const label = document.createElement("label");
            label.textContent = content;
            label.addEventListener("click", config.app.listeners.click.for.svg, false);
            div.appendChild(label);
            /*  */
            const input = document.createElement("input");
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

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
window.addEventListener("click", config.app.listeners.click.for.btn, false);
