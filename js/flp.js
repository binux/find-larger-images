// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<17175297.hk@gmail.com>
//         http://binux.me
// Created on <T_CREATE_DATE>

(function(EXPORT) {
    var height_light_host = ["yande.re", "konachan.com", "hijiribe.donmai.us", "e-shuushuu.net", "chan.sankakustatic.com", "cdn1.gelbooru.com", "cdn2.gelbooru.com", "www.theanimegallery.com", "s1.zerochan.net", "s2.zerochan.net", "s3.zerochan.net", "mangadrawing.net", ];
    function height_light(url) {
      var m = url.match("https?://([^/]+)/");
      if (!m) return false;
      var host = m[1];
      if (height_light_host.indexOf(host) != -1) {
        return true;
      }
      return false;
    };

    function add_file(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var data_url = e.target.result;
        var new_item = $(image_item_tpl);
        new_item.find(".ori-image img").attr('src', data_url).attr("title", file.name).on("load", function() {
          new_item.find(".ori-image .image-size").text(this.naturalWidth+" × "+this.naturalHeight);

        });
        new_item.find(".ori-image a").on("click", function() {
          if (!$(this).attr("download"))
            $(this).attr("href", data_url).attr("download", file.name);
        }).on("mouseout", function() {
          $(this).removeAttr("diwnload").removeAttr("href");
        }).on("contextmenu", function() {
          chrome.tabs.create({url: data_url, active: true});
          return false;
        });
        new_item.find(".search-image").empty().append(image_loading_tpl);
        new_item.appendTo(".image-list");

        var callback_info = {};
        var search_success = function(result) {
          if (result.length > 0) {
            result = result.sort(function(a, b) {
              return b.size[0] * b.size[1] - a.size[0] * a.size[1];
            });
            var out = [];
            out = result.slice(0, 2);
            var size = out.slice(-1)[0].size;
            size = size[0] * size[1];
            var cnt = 0;
            for (var i=2,len=result.length; i<len; i++) {
              if (result[i].size[0] * result[i].size[1] != size) {
                out.push(result[i]);
                size = out.slice(-1)[0].size;
                size = size[0] * size[1];
                cnt++;
              }
              if (cnt >= 3) break;
            };
            console.log(out);

            new_item.find(".search-image").empty();
            $.each(out, function(n, e) {
              var new_image = $(image_tpl).attr("data-status", "waiting");
              if (height_light(e.url)) new_image.addClass("image-height-light");
              new_image.find("img").attr("src", e.sample).attr("title", e.url);
              new_image.find(".image-size").text(e.size[0]+" × "+e.size[1]);
              new_image.attr("href", e.url);
              new_image.on("contextmenu", function(ev) {
                var active = ev.altKey || ev.ctrlKey || ev.shiftKey || ev.metaKey;
                chrome.tabs.create({url: e.url, active: !active});
                return false;
              }).on("click", function() {
                new_image.find("img").attr("src", e.url).on("error", function() {
                  new_image.attr("data-status", "error");
                  new_image.find(".image-hover").removeClass("icon-down").addClass("icon-block");
                }).on("load", function() {
                  new_image.attr("data-status", "ok");
                  new_image.find(".image-hover").removeClass("icon-down").addClass("icon-ok");
                });
                new_image.attr("data-status", "downloading");
                new_image.find(".image-hover").addClass("icon-down");
              });
              new_item.find(".search-image").append(new_image);
            });
            if (callback_info.search_page) {
              $(image_more_tpl).appendTo(new_item.find(".search-image")).find("a").attr("href", callback_info.search_page);
            }
          } else {
            var a = $(image_notfount_tpl).appendTo(new_item.find(".search-image").empty());
            if (callback_info.search_page) {
              a.attr("href", callback_info.search_page).attr("target", "_blank");
            } else {
              a.on("click", function() {
                new_item.find(".search-image").empty().append(image_loading_tpl);
                search(file, search_success, search_error);
                return false;
              });
            }
          }
        };
        var search_error = function() {
          var a = $(image_error_tpl).appendTo(new_item.find(".search-image").empty());
          if (callback_info.search_page) {
            a.attr("href", callback_info.search_page).attr("target", "_blank");
          } else {
            a.on("click", function() {
              new_item.find(".search-image").empty().append(image_loading_tpl);
              search(file, search_success, search_error);
              return false;
            });
          }
        };
        search(file, search_success, search_error, callback_info);
      };
      reader.onerror = function(e) {
        console.error("file "+file.name+" open error");
      };
      reader.readAsDataURL(file);
    };

    function url_escape(url) {
      return $("<div>").html(url).text();
    }

    function search(file, success, error, info) {
      var data = new FormData()
      data.append("image_url", "");
      data.append("btnG", "");
      data.append("image_content", "");
      data.append("filename", "");
      data.append("hl", "en");
      data.append("bih", "704");
      data.append("biw", "1440");
      data.append("num", "10");
      data.append("safe", "off");
      data.append("encoded_image", file);

      $.ajaxq("upload", {
          url: 'http://www.google.com/searchbyimage/upload',
          data: data,
          cache: false,
          contentType: false,
          processData: false,
          type: 'POST',
          success: function(data) {
            info.search_page = get_search_page(data);
            var ret = parse_search(data);
            if (!ret) {
              console.error("parse search page error");
              error();
              return;
            }
            var result = ret[0];
            if (ret[1]) {
              $.ajax({
                  url: url_escape(ret[1]),
                  cache: false,
                  contentType: false,
                  processDate: false,
                  type: 'GET',
                  success: function(data) {
                    var ret = parse_all_size(data);
                    if (!ret) {
                      console.error("parse all size page error");
                      error();
                      return;
                    }
                    result = result.concat(ret);
                    try {
                      success(result);
                    } catch(err) {
                      console.error(err);
                      error();
                    }
                    //console.log(result);
                  },
                  error: function() {
                    console.error("opening all size page error");
                    error();
                  },
              });
            } else {
              try {
                success(result);
              } catch(err) {
                console.error(err);
                error();
              }
            }
          },
          error: function() {
            console.error("uploading error");
            error();
          },
      });
    };

    var image_re = /href="(http:\/\/www\.google\.com)?\/imgres\?imgurl=(.+?)&amp;imgrefurl=/m;
    var image_size1_re = /(-?\d+)&nbsp;&times;&nbsp;(-?\d+)/m;
    var image_sample1_re = /src="(https?:\/\/[^"]+?\.com\/images\?q=tbn:[^"]+?)"/m;
    var image_size2_re = /(-?\d+)&nbsp;&#215;&nbsp;(-?\d+)<\/span>/m;
    var image_sample2_re = /\.src='([^']*?)';}}\)\(document\.getElementsByName\('([^']+)'\)/mg;
    var all_size_re = /href="([^\"]+)">All sizes<\/a>/m;
    function get_search_page(data) {
      var m = data.match(/<div style="display:block">Please click <a href="(.*?)&gbv=1/i);
      if (m)
        return m[1];
      return null;
    }

    function parse_search(data) {
      if (data.indexOf("simg") == -1) {
        console.error("search api error");
        return ;
      }

      var result = [];
      var tmp = data.match(/<li class=g><div class=vsc.*?<!--/gm);
      if (tmp) {
        $.each(tmp, function(n, e) {
          var url = e.match(image_re);
          var size = e.match(image_size1_re);
          var sample = e.match(image_sample1_re);
          if (!url || !size || !sample) {
            console.error(e);
            return;
          }
          result.push({
              url: url_escape(url[2]),
              size: [size[1], size[2]],
              sample: url_escape(sample[1]),
          });
        })
      }
      //console.log(result);
      var all_size_link = data.match(all_size_re);
      if (!all_size_link) {
        all_size_link = null;
      } else {
        if (all_size_link[1].indexOf("http") == 0) {
          all_size_link = all_size_link[1];
        } else {
          all_size_link = "http://www.google.com"+all_size_link[1];
        }
      }
      return [result, all_size_link];
    }

    function parse_all_size(data) {
      var tmp = data.match(image_sample2_re) || [];
      var image_samples = {};
      $.each(tmp, function(n, e) {
        var p = e.replace(image_sample2_re, "$2~~~~$1").split("~~~~");
        image_samples[p[0]] = p[1].replace(/\\x3d/g, "=");
      });
      //console.log(image_samples);

      tmp = data.match(/<li class=rg_li.*?<\/li>/gm);
      if (!tmp) {
        console.error("parse all size image group error");
        return null;
      }
      var result = [];
      $.each(tmp, function(n, e) {
        var url = e.match(image_re);
        var size = e.match(image_size2_re);
        var sample = e.match(/src="([^"]+)"/m);
        if (sample) {
          sample = sample[1];
        } else {
          sample = e.match(/<img class=rg_i name=([^ ]+) /m);
          var _sample = image_samples[sample[1]];
          if (!_sample) {
            //console.log(sample[1]);
            return;
          }
          sample = _sample;
        }
        if (!url || !size || !sample) {
          console.error(e);
          return;
        }
        result.push({
            url: url_escape(url[2]),
            size: [size[1], size[2]],
            sample: sample,
        });
      });
      return result;
    }

    // init
    var image_item_tpl = $("#image-item-tpl").text();
    var image_loading_tpl = $("#image-loading-tpl").text();
    var image_error_tpl = $("#image-error-tpl").text();
    var image_notfound_tpl = $("#image-notfound-tpl").text();
    var image_tpl = $("#image-tpl").text();
    var image_more_tpl = $("#image-more-tpl").text();

    // init event
    document.ondrop = function(ev) {
      ev.preventDefault();
      var files = [];
      $.each(ev.dataTransfer.files, function(n, e) {
        files.push(e);
      });
      if (files.length) {
        $("#helper").hide();
      }
      $.each(files.sort(function(a, b){return a.name>b.name}), function(n, e) {
        add_file(e);
      });
      return false;
    }
})();
