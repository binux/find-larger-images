// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<17175297.hk@gmail.com>
//         http://binux.me
// Created on <T_CREATE_DATE>

(function(EXPORT) {
    function add_file(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var data_url = e.target.result;
        var new_item = $(image_item_tpl);
        new_item.find(".ori-image img").attr('src', data_url).attr("title", file.name).on("load", function() {
          new_item.find(".ori-image .image-size").text(this.naturalWidth+" × "+this.naturalHeight);

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
              new_image.find("img").attr("src", e.sample).attr("title", e.url);
              new_image.find(".image-size").text(e.size[0]+" × "+e.size[1]);
              new_image.on("click", function() {
                if (new_image.attr("data-status") == "waiting") {
                  new_image.find("img").attr("src", e.url).on("load", function() {
                    $.ajax({
                        url: e.url,
                        beforeSend: function(xhr) {
                          xhr.overrideMimeType('text/plain; charset=x-user-defined');
                        },
                        success: function(data, s, xhr) {
                          var content = e.url;
                          if (data.length < 1000000)
                            content = "data:image/jpeg;base64,"+Base64.encodeBinary(data);
                          new_image.find(".image-selected span").attr("class", "icon-ok");
                          new_image.attr("data-status", "ok");
                          new_image.find(".image-selected").wrap('<a class="image-save" target="_blank"></a>');
                          new_image.find(".image-save").attr("href", content)
                                   .attr("download", e.url.split("/").slice(-1)[0])
                                   .on("click", function() {
                                     var _this = this;
                                     setTimeout(function() {
                                       new_image.attr("data-status", "done");
                                       $(_this).removeAttr("href").removeAttr("download");
                                     }, 100);
                          });
                        },
                        type: 'GET',
                    });
                  }).on("error", function() {
                    new_image.find(".image-selected span").attr("class", "icon-block");
                    new_image.attr("data-status", "error");
                  });
                  new_image.attr("data-status", "downloading");
                  new_image.append('<div class="image-selected"><span class="icon-down"></span></div>');
                } else if (new_image.attr("data-status") == "error") {
                  chrome.tabs.create({url: e.url, active: false});
                } else if (new_image.attr("data-status") == "done") {
                  chrome.tabs.create({url: e.url, active: false});
                } else if (new_image.attr("data-status") == "ok") {
                  //chrome.tabs.create({url: e.url, active: false});
                }
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
    }

    function parse_search(data) {
      if (data.indexOf("simg") == -1) {
        console.error("search api error");
        return ;
      }

      var result = [];
      var image_in_page = data.match(/matching images.*?(imagebox_bigimages|<\/ol>)/i);
      if (image_in_page) {
        var tmp = image_in_page[0].match(/<li class=g>.*?<!--/gm);
        if (!tmp) {
          console.error("parser search image group error");
          return null;
        }
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

    var Base64 = {
      // from http://emilsblog.lerch.org/2009/07/javascript-hacks-using-xhr-to-load.html

      // private property
      _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

      encodeBinary : function(input){
        var output = "";
        var bytebuffer;
        var encodedCharIndexes = new Array(4);
        var inx = 0;
        var paddingBytes = 0;

        while(inx < input.length){
          // Fill byte buffer array
          bytebuffer = new Array(3);
          for(jnx = 0; jnx < bytebuffer.length; jnx++)
          if(inx < input.length)
          bytebuffer[jnx] = input.charCodeAt(inx++) & 0xff; // throw away high-order byte, as documented at: https://developer.mozilla.org/En/Using_XMLHttpRequest#Handling_binary_data
        else
          bytebuffer[jnx] = 0;

        // Get each encoded character, 6 bits at a time
        // index 1: first 6 bits
        encodedCharIndexes[0] = bytebuffer[0] >> 2;  
        // index 2: second 6 bits (2 least significant bits from input byte 1 + 4 most significant bits from byte 2)
        encodedCharIndexes[1] = ((bytebuffer[0] & 0x3) << 4) | (bytebuffer[1] >> 4);  
        // index 3: third 6 bits (4 least significant bits from input byte 2 + 2 most significant bits from byte 3)
        encodedCharIndexes[2] = ((bytebuffer[1] & 0x0f) << 2) | (bytebuffer[2] >> 6);  
        // index 3: forth 6 bits (6 least significant bits from input byte 3)
        encodedCharIndexes[3] = bytebuffer[2] & 0x3f;  

        // Determine whether padding happened, and adjust accordingly
        paddingBytes = inx - (input.length - 1);
        switch(paddingBytes){
        case 2:
          // Set last 2 characters to padding char
          encodedCharIndexes[3] = 64; 
          encodedCharIndexes[2] = 64; 
          break;
        case 1:
          // Set last character to padding char
          encodedCharIndexes[3] = 64; 
          break;
        default:
          break; // No padding - proceed
        }
        // Now we will grab each appropriate character out of our keystring
        // based on our index array and append it to the output string
        for(jnx = 0; jnx < encodedCharIndexes.length; jnx++)
          output += this._keyStr.charAt(encodedCharIndexes[jnx]);
        }
        return output;
      }
    };

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
      $.each(files.sort(function(a, b){return a.name>b.name}), function(n, e) {
        add_file(e);
      });
      return false;
    }
})();
