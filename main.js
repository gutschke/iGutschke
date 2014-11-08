iGutschke = function() {
  // Array of dynamically instantiated gadgets. This array grows as gadgets
  // are created from callbacks. It contains arrays with exactly two elements.
  // The first element is the object returned from the plug-in module, when it
  // instantiated the gadget. The second element is the next time a refresh
  // of the gadget is scheduled to happen.
  var gadgets = [ ];

  return {
    // Main entry point. This function sets up handlers for loading data from
    // the various data sources, and then dynamically builds the web page.
    init: function() {
      // Polyfill for older browers
      if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(fn, scope) {
          for (var i = 0, len = this.length; i < len; ++i) {
            fn.call(scope, this[i], i, this);
          }
        }
      }

      // Map of all dynamically plug-in modules. While the script is still
      // loading, the "key" of this hash map contains a list of pending
      // callbacks that will be invoked as soon as the script has loaded
      // successfully.
      var loadedScripts = { };

      // Parse query string into "query" hash table.
      var query = { };
      location.search.slice(1).split('&').forEach(function(kv) {
          var decode = function(s) {
            return decodeURIComponent(s.replace(/[+]/g, ' ')).
                     replace(/\r\n|\r|\n/g, '\n');
          };
          kv = kv.split('=');
          query[decode(kv[0]).toLowerCase()] = decode(kv[1] || ''); });

      // Loads a plug-in module and invokes the callback method as soon as
      // the module is available.
      var loadPlugIn = function(script, cb) {
        // Each module defines a single function that has the same name as
        // the script file. Once the function has been loaded, invoke the
        // callback and give it the function as an argument.
        var scriptLoaded = function(script, cb) {
          var fnc = window[script.replace(/(.*\/)*([^.]*)(\..*)?/, '$2')];
          cb(fnc);
        };

        // Check whether we have already loaded or started to load this
        // plug-in.
        var callbacks = loadedScripts[script];
        if (callbacks === undefined) {
          // This is the very first request for this plug-in. Create a new
          // <script> tag to load it.
          callbacks = [ cb ];
          var tag = document.createElement('script');
          var loaded = false;
          tag.setAttribute('type', 'text/javascript');
          tag.setAttribute('src', script);

          // Set an event handler that fires once the plug-in has loaded.
          tag.onload = tag.onreadystatechange = function() {
            if (!loaded &&
                (!this.readyState ||
                 this.readyState === 'loaded' ||
                 this.readyState === 'complete')) {
              loaded = true;
              tag.onload = tag.onreadystatechange = null;

              // Process all callbacks that have been waiting for this plug-in.
              for (var i = 0; i < callbacks.length; ++i) {
                scriptLoaded(script, callbacks[i]);
              }
              callbacks.length = 0;
            }
          };
          loadedScripts[script] = callbacks;
          document.getElementsByTagName('head')[0].appendChild(tag);
        } else if (callbacks.length === 0) {
          // This plug-in has previously been loaded successfully. The callback
          // can be invoked synchronously.
          scriptLoaded(script, cb);
        } else {
          // We are in the process of loading this plug-in. Add our callback to
          // the list of pending callback requests. It will be invoked once
          // loading has finished.
          callbacks.push(cb);
        }
      };

      // Handles expired timer events and schedules a new timer, if needed.
      var handleTimerEvents = function() {
        var timerId = undefined;
        var nextScheduled = undefined;
        var setNewTimer = function(handler, timeout) {
          var id = setTimeout(function() { handler(id) }, timeout);
          return id;
        };
        var handler = function(id) {
          if (id !== undefined && id === timerId) {
            timerId = undefined;
            nextScheduled = undefined;
          }
          do {
            var now = Math.floor(new Date()/1000);
            var fired = false;
            var nextRequested = undefined;
            for (var i = 0; i < gadgets.length; ++i) {
              var when = gadgets[i][1];
              if (when === undefined) {
                continue;
              }
              if (when <= now) {
                fired = true;
                gadgets[i][1] = gadgets[i][0].refresh(now);
              } else if (nextRequested === undefined || when < nextRequested) {
                nextRequested = when;
              }
            }
          } while (fired);
          if (nextRequested !== nextScheduled) {
            if (nextScheduled !== undefined) {
              clearTimeout(timerId);
              timerId = undefined;
            }
            if (nextRequested !== undefined) {
              nextScheduled = nextRequested;
              timerId = setNewTimer(handler, (nextScheduled - now) * 1000);
            }
          }
        };
        return handler;
      }();

      // Parse the JSON data that describes the page layout and the different
      // data sources.
      var parseInfo = function(request) {
        var now = Math.floor(new Date()/1000);
        var tr =
            document.getElementById('igutschke').getElementsByTagName('tr')[0];
        var td = undefined;
        var json = JSON.parse(request.responseText);
        for (var i = 0; i < json.length; ++i) {
          if (json[i] === null) {
            td = undefined;
            continue;
          }
          if (td === undefined) {
            td = document.createElement('td');
            tr.appendChild(td);
          }
          var container = document.createElement('div');
          container.setAttribute('class', 'gadget ' +
                              json[i][1].replace(/(.*\/)*([^.]*)(\..*)?/, '$2'));
          container.innerHTML =
              '<div>' + iGutschke.quoteHTML(json[i][0]) +
              '</div><div class="container"></div>';
          td.appendChild(container);
          loadPlugIn(
              json[i][1],
              function(now, container, parms) {
                return function(fnc) {
                  var obj = fnc(container, parms);
                  gadgets.push([ obj, obj.refresh(now) ]);
                  handleTimerEvents();
                };
              }(now, container.getElementsByClassName('container')[0], json[i]));
        }
        td = tr.childNodes;
        var width = Math.floor(100 / td.length) + '%';
        for (var i = 0; i < td.length; ++i) {
          td[i].setAttribute('width', width);
        }
      };

      iGutschke.submitXMLRequest((query['info'] || 'info') + '.json', parseInfo);
    },

    // Quotes a string so that it can safely be displayed as HTML.
    quoteHTML: function() {
      var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#47;'
      };
      return function(s) {
        return s ? s.replace(/[&<>"'\/]/g, //"
                             function(c) { return map[c]; }) : '';
      };
    }(),

    // Sends an XMLHttpRequest() request for an external resource. Typically
    // this would be a JSON file. Calls the callback once the resource has
    // loaded successfully.
    submitXMLRequest: function(src, cb) {
      var request = new XMLHttpRequest();
      request.open('GET', src, true);
      request.setRequestHeader('X-iGutschke', '1');
      request.timeout = 30000;
      request.ontimeout = function() { };
      request.onreadystatechange = function() {
        if (request.readyState === 4 /* XHR_LOADED */ &&
            request.status === 200) {
          cb(request);
        }
      };
      try {
        request.send();
      } catch (e) {
      }
    },

    // Parse a string into an XML document object model.
    domParser: function() {
      if (window.DOMParser) {
        return function(parser) {
          return function(s) {
            return parser.parseFromString(s, 'text/xml');
          };
        }(new DOMParser());
      } else {
        // Internet Explorer
        return function(s) {
          var dom = new ActiveXObject('Microsoft.XMLDOM');
          dom.async = false;
          dom.loadXML(s);
          return dom;
        };
      }
    }(),

    // Computes, when the next timeout event should happen.
    nextTimeOut: function(now, inc) {
      if (inc === null) {
        return now + 15*60;
      } else if (inc === 0) {
        return undefined;
      } else {
        return now + inc;
      }
    }
  };
}();
