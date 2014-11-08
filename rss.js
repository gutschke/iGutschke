var rss = function(container, json) {
  return {
    refresh: function(now) {
      iGutschke.submitXMLRequest(
          // Submit a proxy request for the RSS data in XML form.
          'nph-proxy.cgi?req=rss:' + encodeURIComponent(json[3][0]) + '&s=' +
              encodeURIComponent(json[3][1]) + '&len=' +
              (json[3][4] ? encodeURIComponent(json[3][4]) : '64000'),

          function(request) {
            if (!request || !(request.responseXML || request.response)) {
              return;
            }

            // Retrieve all the "item" tags, describing the different news items.
            var xml;
            if (request.responseXML) {
              xml = request.responseXML.getElementsByTagName('item');
            } else {
              xml = iGutschke.domParser(request.response).getElementsByTagName('item');
            }

            // Retrieve XML values from the current "item" tag, and escape
            // all special characters.
            var data = function(tag) {
              return iGutschke.quoteHTML(xml[i].getElementsByTagName(tag)[0].
                                         childNodes[0].nodeValue);
            };

            // Optionally post-process the HTML content.
            if (json[3][3]) {
              var filter = eval('[' + json[3][3] + '][0]');
            }

            // Retrieve XML values from the current "item" tag, and return
            // sanitized HTML.
            var text = function(tag) {
              // Sanitize HTML content.
              try {
                var html = html_sanitize(
                  xml[i].getElementsByTagName(tag)[0].childNodes[0].nodeValue,
                  function(s) { return s; });
              } catch (e) {
                return '';
              }

              // Optionally post-process the HTML content.
              if (filter) {
                html = filter(html);
              }

              return html;
            };

            // Iterate over all "item" tags and generate HTML for the content.
            var collapsed = '<span class="collapsed"></span>';
            var expanded = '<span class="expanded"></span>';
            var html = '';
            for (var i = 0; i < xml.length && i < json[3][2]; ++i) {
              try {
                html += '<div><a class="toggle">' + collapsed + '</a>' +
                        '<a class="title" href="' + data('link') + '">' +
                        text('title') + '</a><div class="preview">' +
                        (text('description') || text('title')) + '</div></div>';
              } catch (e) {
              }
            }

            // Update the container with the new content.
            container.innerHTML = html;

            // Remove iframes. They probably will be empty at this point, as the
            // sanitizer rewrote them.
            var iframes = container.getElementsByTagName('iframe');
            while (iframes[0]) {
              iframes[0].parentNode.removeChild(iframes[0]);
            }

            // Set up handler to allow opening and closing content details.
            var toggles = container.getElementsByClassName('toggle');
            for (var i = 0; i < toggles.length; ++i) {
              toggles[i].onclick = function() {
                var toggle = toggles[i];
                var other = container.getElementsByClassName('preview');
                var preview = toggle.parentNode.getElementsByClassName('preview')[0];
                return function(e) {
                  // Close all other content details, if currently visible.
                  for (var i = 0; i < other.length; ++i) {
                    if (other[i] !== preview && other[i].style.display) {
                      other[i].style.display = null;
                      other[i].parentNode.getElementsByClassName('toggle')[0].
                          innerHTML = collapsed;
                    }
                  }

                  // Toggle content details for item that was clicked.
                  if (preview.style.display === 'block') {
                    toggle.innerHTML = collapsed;
                    preview.style.display = null;
                  } else {
                    toggle.innerHTML = expanded;
                    preview.style.display = 'block';
                  }

                  return false;
                };
              }();
            }
          });

      // Make the title of this gadget clickable.
      var title = container.parentNode.firstChild;
      if (title.getElementsByClassName('a').length === 0) {
        title.innerHTML = '<a href="http://' + iGutschke.quoteHTML(json[3][0]) + '">' +
                          title.innerHTML + '</a>';
      }

      return iGutschke.nextTimeOut(now, json[2]);
    }
  };
};
