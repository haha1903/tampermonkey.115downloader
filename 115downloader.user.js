// ==UserScript==
// @name        115Downloader
// @namespace   https://github.com/luoweihua7/tampermonkey.115downloader
// @homepageURL https://github.com/luoweihua7/tampermonkey.115downloader
// @supportURL  https://github.com/luoweihua7/tampermonkey.115downloader/issues
// @description 115网盘下载插件,提供复制下载链接到剪切版,添加到Aria下载功能(添加到群晖DS功能暂未开始写)
// @author      luoweihua7
// @icon        https://github.com/luoweihua7/tampermonkey.115downloader/raw/master/icon.ico
// @include     http*://115.com/?ct=file*
// @include     http*://115.com/?aid=-1&search*
// @downloadURL https://github.com/luoweihua7/tampermonkey.115downloader/raw/master/115downloader.user.js
// @updateURL   https://github.com/luoweihua7/tampermonkey.115downloader/raw/master/115downloader.user.js
// @version     0.1.0
// @grant       unsafeWindow
// @grant       GM_setClipboard
// @grant       GM_setValue
// @grant       GM_getValue
// @run-at      document-end
// @require     http://115.com/static/js/jquery.js?v=1472810197
// ==/UserScript==

(function () {
    'use strict';

    // 115 内置对象
    var Core = top.Core;
    var DialogBase = Core.DialogBase;
    var Message = Core.MinMessage;
    var Ajax = top.UA$.ajax;

    var _toString = Object.prototype.toString;

    /**
     * 获取网盘文件的下载地址
     * @param data
     * @param callback
     */
    var getUrl = function (data, callback) {
        Ajax({
            url: 'files/download?pickcode=' + data.pickcode,
            type: 'GET',
            dataType: 'json',
            cache: false,
            success: function (json) {
                if (json.state) {
                    callback(json.file_url);
                } else {
                    callback();
                }
            },
            error: function (err) {
                callback(err);
            }
        });
    };

    /**
     * Aria2相关方法
     */
    var ARIA2 = {
        config: {
            regex: /^(http\:\/\/|https\:\/\/)?((.*):(.*)?@)?([a-zA-Z0-9\.-_]*)(\:(\d+))\/jsonrpc$/,
            conf: '',
            url: '',
            protocol: '',
            token: '',
            host: 'localhost',
            port: 6800
        },
        init: function () {
            var conf = GM_getValue('aria2_conf') || 'http://localhost:6800/jsonrpc';
            this.setConf(conf);

            // 添加Aria2的设置按钮
            var $container = $('#js_top_panel_box #js-ch-member-info_box .tup-logout');
            var $setting = $('<a href="javascript:;"><span>Aria2设置</span></a>');

            $container.prepend($setting);
            $setting.off('click').on('click', function (e) {
                ARIA2.showConf();
            });
        },
        setConf: function (conf, onSuccess, onFail) {
            var config = this.config;
            var regex = config.regex;

            if (regex.test(conf)) {
                GM_setValue('aria2_conf', conf);
                conf.replace(regex, function (match, $1, $2, $3, $4, $5, $6, $7) {
                    // 兼容user:password的模式和token的模式
                    var user = '', password = '', token = '';
                    if ($3 && $4) {
                        if ($3 === 'token') {
                            token = $4;
                        } else {
                            user = $3;
                            password = $4;
                        }
                    }

                    config = Object.assign(config, {
                        conf: conf,
                        url: $1 + $5 + ($7 ? (':' + $7) : '') + '/jsonrpc',
                        protocol: $1,
                        token: token,
                        user: user,
                        password: password,
                        host: $5,
                        port: $7
                    });
                });
                onSuccess && onSuccess();
            } else {
                onFail && onFail();
            }
        },
        showConf: function () {
            var conf = this.config.conf;
            var content = `<div class="dialog-input"><input type="text" rel="txt" class="text" /></div>`;
            var options = {
                content: content,
                title: '设置RPC地址'
            };
            var $input;
            var dialog = UI.confirm(options, function () {
                var val = $input.val();

                ARIA2.setConf(val, function () {
                    dialog.Close && dialog.Close();
                    UI.showMessage('RPC地址已保存', 'suc');
                }, function () {
                    UI.showMessage('Aria2地址不正确', 'err');
                });
            });

            $input = dialog.$el.find('input.text');
            $input.val(conf);
        },
        /**
         * 添加下载任务
         * @param uri {String} 下载地址
         */
        addUri: function (uri) {
            var config = this.config;
            var url = config.url + '?tm=' + Date.now();
            var params = [];
            var data;

            if (config.token) {
                params.push('token:' + config.token);
            } else if (config.user && config.password) {
                params.push(config.user + ':' + config.password);
            }

            params.push([uri]);
            //这是Aria下载参数,使用默认,后续开放设置
            params.push({
                //保存路径
                //"out": '/downloads',

                //分块下载
                "split": "5",

                //连接数
                "max-connection-per-server": "5",

                //分享率(BT)
                //"seed-ratio": "1.0",

                //自定义header头
                "header": "Cookie: " + unsafeWindow.document.cookie
            });

            data = [{
                jsonrpc: '2.0',
                method: 'aria2.addUri',
                id: Date.now(),
                params: params
            }];

            $.ajax({
                url: url,
                type: 'POST',
                data: JSON.stringify(data),
                success: function (json) {
                    if (json && json.error) {
                        var msg = json.error.message || '添加任务失败';
                        UI.showMessage(msg, 'err');
                    } else {
                        UI.showMessage('添加任务成功', 'suc');
                    }
                },
                error: function () {
                    UI.showMessage('添加任务失败', 'err');
                }
            })
        }
    };

    /**
     * 插件界面UI(沿用115原生UI)
     */
    var UI = {
        showMessage: function (text, type) {
            Message.Show({
                type: type,
                text: text,
                timeout: 3000
            });
        },
        confirm: function (params, onSubmit, onCancel) {
            var buttomEl = `<div class="dialog-action"><a href="javascript:;" class="dgac-cancel" btn="cancel">取消</a><a href="javascript:;" class="dgac-confirm" btn="confirm">确定</a></div>`;
            var title = params.title;
            var $content = $(params.content + buttomEl);
            var dialog = new DialogBase({
                title: title,
                content: $content
            });

            dialog.Open(null);
            dialog.$el = $content.eq(0); // 只返回内容部分,title和按钮区域不返回
            dialog.$buttons = $content.eq(1);
            dialog.$buttons.find('.dgac-confirm').on('click', onSubmit || $.noop);
            dialog.$buttons.find('.dgac-cancel').on('click', function () {
                onCancel && onCancel();
                dialog.Close && dialog.Close();
            });

            return dialog;
        },
        addButtons: function () {
            var opers = document.querySelectorAll("#js_data_list_outer .file-opr");
            var oper;

            function addButton(container, operate) {
                var linkMap = {
                    copyUrl: {menu: 'copy-link', icon: 'ico-copy', text: '复制'},
                    aria2Download: {menu: 'aria2-download', icon: 'ico-download', text: 'ARIA2下载'},
                    nasDownload: {menu: 'nas-download', icon: 'ico-download', text: 'NAS下载'},
                };
                var link = linkMap[operate];
                var tpl = `<a menu="${link.menu}"><i class="icon ${link.icon}"></i><span>${link.text}</span></a>`;
                var $container = $(container);
                var $link = $(tpl);

                $container.append($link);

                // 按钮点击事件
                $link.off('click').on('click', function (e) {
                    var $li = $container.closest('li');

                    getUrl({pickcode: $li.attr('pick_code')}, function (data) {
                        var type = _toString.apply(data);

                        if (type == '[object String]') {
                            var func = App[operate];
                            func(data);
                        } else if (type == '[object Undefined]') {
                            // 请求后台成功,返回数据错误
                            UI.showMessage('获取链接失败', 'war');
                        } else {
                            UI.showMessage('获取链接失败', 'err');
                        }
                    });

                    e.stopPropagation();
                    e.preventDefault();
                });
            }

            for (var i in opers) {
                if (opers.hasOwnProperty(i)) {
                    oper = opers[i];

                    addButton(oper, 'copyUrl');
                    addButton(oper, 'aria2Download');
                    addButton(oper, 'nasDownload');
                }
            }
        },
    };

    var App = {
        init: function () {
            ARIA2.init();

            // 监听列表变化,然后添加按钮
            var observer = new MutationObserver(UI.addButtons);
            observer.observe(document.querySelector('#js_data_list'), {'childList': true});
        },
        copyUrl: function (url) {
            GM_setClipboard(url);
            UI.showMessage('链接已复制', 'suc');
        },
        aria2Download: function (url) {
            ARIA2.addUri(url);
        },
        nasDownload: function (url) {
            UI.showMessage('已添加到NAS下载', 'suc');
        }
    };

    App.init();
})();
