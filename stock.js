var stock = function(container, json) {
  return {
    refresh: function(now) {
      iGutschke.submitXMLRequest(
          // Submit a proxy request for the stock quote(s) in XML form.
          'nph-proxy.cgi?req=stock&s=' +
            encodeURIComponent('stock=' + json[3].join('&stock=')),
    
          function(request) {
            // Retrieve all the "finance" tags, describing the different quotes.
            var xml = request.responseXML.getElementsByTagName('finance');
    
            // Retrieve XML values from the current "finance" tag, and escape
            // all special characters.
            var data = function(tag) {
              return iGutschke.quoteHTML(xml[i].getElementsByTagName(tag)[0].
                                         getAttribute('data'));
            };
    
            // Iterate over all "finance" tags and generate HTML for the content.
            var html = '<table width="100%">';
            for (var i = 0; i < xml.length; ++i) {
              try {
                var change = data('change');
                html += '<tr><td><a href="http://google.com/' +
                        data('symbol_lookup_url') + '" title="' + data('company') +
                        '">' + data('symbol') + '</a></td><td align="right">' +
                        data('last') + '</td><td align="right" class="' +
                        (change.indexOf('+') == 0 ? 'up' : 'down') + '">' +
                        change + '&nbsp;(' + data('perc_change') + '%)</td></tr>';
              } catch (e) {
              }
            }
    
            // Update the container with the new content.
            container.innerHTML = html + '</table>';
          });
      return iGutschke.nextTimeOut(now, json[2]);
    }
  };
};
