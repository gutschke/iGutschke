var nasdaq = function(container, json) {
  return {
    refresh: function(now) {
      iGutschke.submitXMLRequest(
          // Submit a proxy request for the stock quote(s) in XML form.
          // Stock symbols can either be plain strings, or an array with
          // both the ticker symbol and the human-readable company name.
          'nph-proxy.cgi?req=nasdaq&s=' +
          encodeURIComponent('symbol=' +
              json[3].map(function(s) {
                            return typeof(s) === "object" ? s[0] : s; }
                          ).join('&symbol=')),

          function(request) {
            // Extract HTML tables showing stock ticker symbols
            var tables = document.createElement('div');
            tables.innerHTML = html_sanitize(
                request.responseXML.getElementsByTagName('item')[0].
                                    getElementsByTagName('description')[0].
                                    childNodes[0].data);
            tables = tables.getElementsByTagName('table');

            // Create a map from ticker symbols to full company names, if
            // available.
            var company = { };
            for (var i = 0; i < json[3].length; ++i) {
              if (typeof(json[3][i]) === 'object') {
                // Enter human-readable company name into table.
                company[json[3][i][0]] = json[3][i][1];
              } else {
                // No company name given. Use stock symbol instead.
                company[json[3][i]] = json[3][i];
              }
            }

            // Iterate over tables, extract data and generate new HTML
            var html = '<table width="100%">';
            for (var i = 0; i < tables.length; ++i) {
              try {
                // The feed contains tables with one entry per row: 1) ticker,
                // 2) last trade, 3) absolute change, 4) percentage change.
                // It also contains other tables with junk. So, we add plenty
                // of sanity checks and skip data that we cannot parse.
                var tr = tables[i].getElementsByTagName('tr');

                // Extract ticker symbol from first table row.
                var ticker = iGutschke.quoteHTML(
                    tr[0].getElementsByTagName('td')[0].innerText.
                    trim());
                if (!company[ticker]) {
                  continue;
                }

                // Extract last trade from second table row.
                var last = tr[1].innerText.trim();
                if (last.indexOf('Last') < 0) {
                  continue;
                }
                last = iGutschke.quoteHTML(
                    last.replace(/[^0-9.]*([0-9.]*).*/, '$1'));

                // Extract absolute change from third table row. Make sure that
                // we have exactly two trailing decimals. Retain sign, if
                // present.
                var change = tr[2].innerText.trim();
                if (change.indexOf('Change') < 0) {
                  continue;
                }
                change = iGutschke.quoteHTML(
                (change+'00').replace(/[^-+0-9.]*([-+]?[0-9]*[.][0-9][0-9]).*/,
                                      '$1'));

                // Extract percentage change from fourth table row. Make sure
                // that we have exactly two trailing decimals. Copy sign from
                // previously extracted absolute change.
                var percent = tr[3].innerText.trim();
                if (percent.indexOf('% Change') < 0) {
                  continue;
                }
                percent = iGutschke.quoteHTML(
                  change.replace(/^([-+]?).*/, '$1') +
                  (percent.replace(/[^0-9.]*/g, '') + '00').
                      replace(/([0-9]*[.][0-9][0-9]).*/, '$1'));

                // Compute table row with all the data that we want to display.
                // Make sure everything is quoted appropriately.
                html += '<tr><td><a href="http://google.com/finance?q=NASDAQ:' +
                    ticker + '" title="' +
                    iGutschke.quoteHTML(company[ticker]) +
                    '">' + ticker + '</a></td><td align="right">' +
                    last + '</td><td align="right" class="' +
                    (change.indexOf('-') == 0 ? 'down' : 'up') + '">' +
                    change + '&nbsp;(' + percent + '%)</td></tr>';
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
