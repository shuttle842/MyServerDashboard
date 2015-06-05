$(function() {
  var getConfig = function() {
    return new Promise(function(resolve, reject) {
      $.ajax({
        type:'GET',
        url:'config.json',
        dataType:'json'
      }).then(function(rsp) {
        console.log(rsp);
        resolve(rsp);

      });
    });
  };

  getConfig().then(function(config) {
    var imageList = config.cells;
    var cells = {};
    var cnt = $('.cells');

    imageList.forEach(function(u) {
      var el = $('<div>', {
        'class': 'cell',
        'data-image': u
      });
      cnt.append(el);
      cells[u] = el;
    });


    ImageStore.setOptions({
      username: config.auth.username||null,
      password: config.auth.password||null,
      ttl: config.ttl||5*60
    });
    ImageStore.setList(imageList);
    ImageStore.addEventListener(function(list) {
      list.forEach(function(el) {
        if (el.success) {
          var dom = cells[el.url];
          $(dom).css('background-image', 'url('+el.data+')');
          if (!el.isStale) {
            console.info('Rendered image', el.url)
          } else {
            console.warn('Rendered stale image', el.url)
          }
        } else {
          // TODO: handle failure and stalls
        }
      });
    });
    ImageStore.fetch();
  });
});
