/*
*   Load external images
*/
(function($, win) {
  function base64Encode(str) {
    var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var out = "", i = 0, len = str.length, c1, c2, c3;
    while (i < len) {
      c1 = str.charCodeAt(i++) & 0xff;
      if (i == len) {
        out += CHARS.charAt(c1 >> 2);
        out += CHARS.charAt((c1 & 0x3) << 4);
        out += "==";
        break;
      }
      c2 = str.charCodeAt(i++);
      if (i == len) {
        out += CHARS.charAt(c1 >> 2);
        out += CHARS.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
        out += CHARS.charAt((c2 & 0xF) << 2);
        out += "=";
        break;
      }
      c3 = str.charCodeAt(i++);
      out += CHARS.charAt(c1 >> 2);
      out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
      out += CHARS.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
      out += CHARS.charAt(c3 & 0x3F);
    }
    return out;
  };

  function loadExternalImage(url, username, password) {
    if (Array.isArray(url)) {
      return Promise.all(url.map(function(u) {
        return loadExternalImage(u, username, password);
      }));
    }

    if (!url) {
      throw "Url arguments for loadExternalImage are requeired";
    }

    // console.info('Loading image', url);
    return new Promise(function(resolve, reject) {
      var cf = {
        type: "GET",
        timeout: 5000,
        url: url,
        mimeType: "text/plain; charset=x-user-defined",
        headers: {},
        success: function (rsp){
          var imgData = 'data:image/jpeg;base64,'+base64Encode(rsp),
              img = new Image();

          img.addEventListener('load', function() {
            resolve({
              url: url,
              data: imgData
            });
          });
          img.addEventListener('error', function() {
            reject('Failed loading image (got invalid response) '+url);
          });
          img.src = imgData;
        },
        error: function() {
          reject('Failed loading image (request failed) '+url);
        }
      };

      if (username && password) {
        cf.headers.Authorization = "Basic " + btoa(username + ":" + password);
      }

      $.ajax(cf);
    });
  };

  win.loadImage = loadExternalImage;
}(jQuery, window));

/*
*   Refreshable image store
*/
(function($, win) {
  var _list = [];
  var _options = {};
  var _listeners = [];
  var _lc = win.localStorage;
  var _timer = null;

  function clearRefresh() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
  };

  function bootRefresh() {
    clearRefresh();
    if (_list.length>0 && ttl()) {
      _timer = setInterval(function() {
        fetch().then(bootRefresh, bootRefresh);
      }, ttl()*1000)
    }
  }

  function setList(list) {
    _list = list;
    bootRefresh();
  };

  function getList() {
    return _list;
  };

  function setOptions(opts) {
    _options = opts;
    bootRefresh();
  };

  function getOptions() {
    return _options;
  };

  function addEventListener(cb) {
    _listeners.push(cb);
  };

  function localKey(name) {
    return (_options['local_prefix']||'img_store_')+name;
  };

  function fetchLocal(name, def) {
    var key = localKey(name),
        val = _lc.getItem(key)
    ;

    return val || def || null;
  }

  function fetchJson(name, def) {
    var res = fetchLocal(name)
    if (res===null) {
      return def||null;
    }
    return JSON.parse(res);
  };

  function storeLocal(name, value) {
    _lc.setItem(localKey(name), value);
  };

  function storeJson(name, value) {
    storeLocal(name, JSON.stringify(value));
  };

  function deleteLocal(name) {
    _lc.removeItem(localKey(name));
  };

  function nowTs() {
    return Math.floor(Date.now()/1000);
  };

  function ttl() {
    return _options.ttl || 60*5;
  };

  function fetchMeta() {
    var meta = fetchJson('meta', {
        nextId: 1,
        list: {}
    });
    meta.forEach = function(cb) {
      for (var url in this.list) {
        cb(this.list[url], url);
      }
    };
    meta.get = function(url) {
      return this.list[url];
    };
    return meta;
  };

  function storeMeta(meta) {
    storeJson('meta', {
      nextId: meta.nextId,
      list: meta.list
    });
  }

  function fetch() {
    var meta = fetchMeta(),
      url,
      now = nowTs(),
      needLoad = []
    ;

    // refresh meta
    _list.forEach(function(u) {
      if (!meta.list[u]) {
        meta.list[u] = {
          ind: meta.nextId++
        };
      }
    });
    meta.forEach(function(item, url) {
      if (_list.indexOf(url)===-1) {
        deleteLocal('img_'+item.ind);
        delete meta.list[url];
      }

    });
    storeMeta(meta);

    meta.forEach(function(item, url) {
      var ts = item.ts || 0;
      if (now - ts >= ttl()) {
        needLoad.push(url);
      }
    });

    if (needLoad.length===0) {
      // console.info('All images loaded from cache');
    }

    return win.loadImage(
      needLoad,
      _options['username'] || null,
      _options['password'] || null

      ).then(function(loaded) {
      var meta = fetchMeta(),
          now = nowTs()
      ;
      loaded.forEach(function(imgInfo) {
        var item = meta.get(imgInfo.url);
        item.ts = now;
        storeLocal('img_'+item.ind, imgInfo.data);
      });
      storeMeta(meta);

      return null;
    }, function(err) {
      return err;
    }).then(function(err) {
      var meta = fetchMeta('meta'),
          list = [],
          now = nowTs()
      ;

      meta.forEach(function(item, url) {
        var f = {
          success: !!item.ts,
          url: url
        };

        if (f.success) {
          f.data = fetchLocal('img_'+item.ind);
          f.fetched_at = new Date(item.ts*1000);
          f.isStale = now - item.ts > ttl();
          list.push(f);
        }
      });

      _listeners.forEach(function(cb) {
        cb(list);
      });

      return list;
    });
  };

  win.ImageStore = {
    getList: getList,
    setList: setList,
    getOptions: getOptions,
    setOptions: setOptions,
    addEventListener: addEventListener,
    fetch: fetch
  };
}(jQuery, window));
