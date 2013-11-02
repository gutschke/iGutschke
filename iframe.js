var iframe = function(container, json) {
  return {
    refresh: function(now) {
      container.innerHTML = '<iframe src="' + iGutschke.quoteHTML(json[3][0]) + '" />';
      return iGutschke.nextTimeOut(now, json[2]);
    }
  };
};
