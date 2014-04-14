var stock = function(container, json) {
  return {
    refresh: function(now) {
      iGutschke.submitXMLRequest(
          // Submit a proxy request for the stock quote(s) in XML form.
          'nph-proxy.cgi?req=stock&s=' +
            json[3].map(function(x) {
                          return x[0].replace(/[^-.0-9a-zA-Z]/g,''); })
                   .join(','),
    
          function(request) {
            // Retrieve all the "row" tags, describing the different quotes.
            var xml = request.responseXML.getElementsByTagName('row');
    
            // Retrieve XML values from the current "row" tag, and escape
            // all special characters.
            var data = function(tag) {
              return iGutschke.quoteHTML(xml[i].getElementsByTagName(tag)[0].
                                         textContent);
            };
    
            // Iterate over all "row" tags and generate HTML for the content.
            var html = '<table width="100%">';
            for (var i = 0; i < xml.length; ++i) {
              try {
                var change = parseFloat(data('change')).toFixed(2);
                var price  = parseFloat(data('price' )).toFixed(2);
                var percChange = price && price != 'NaN' && change != 'NaN'
                               ? (100.0*change/price).toFixed(2) : 0;
                html += '<tr><td><a href="http://google.com/finance?q=' +
                        encodeURIComponent(json[3][i][0]) + '" title="' +
                        iGutschke.quoteHTML(json[3][i][1]) +
                        '">' + data('symbol') + '</a></td><td align="right">' +
                        price + '</td><td align="right" class="' +
                        (change >= 0 ? 'up' : 'down') + '">' + change +
                        '&nbsp;(' + percChange + '%)</td></tr>';
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
