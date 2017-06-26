'use strict';

System.register(['app/plugins/sdk', 'lodash', 'app/core/utils/kbn', 'app/core/time_series', 'moment', 'jquery', './css/ajax-panel.css!'], function (_export, _context) {
    "use strict";

    var MetricsPanelCtrl, _, kbn, TimeSeries, moment, $, _createClass, panelDefaults, AjaxCtrl;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    return {
        setters: [function (_appPluginsSdk) {
            MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
        }, function (_lodash) {
            _ = _lodash.default;
        }, function (_appCoreUtilsKbn) {
            kbn = _appCoreUtilsKbn.default;
        }, function (_appCoreTime_series) {
            TimeSeries = _appCoreTime_series.default;
        }, function (_moment) {
            moment = _moment.default;
        }, function (_jquery) {
            $ = _jquery.default;
        }, function (_cssAjaxPanelCss) {}],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            panelDefaults = {
                method: 'GET',
                url: 'https://raw.githubusercontent.com/ryantxu/ajax-panel/master/static/example.txt',
                errorMode: 'show',
                params_js: "{\n" + " from:ctrl.range.from.format('x'),  // x is unix ms timestamp\n" + " to:ctrl.range.to.format('x'), \n" + " height:ctrl.height\n" + "}",
                display_js: null
            };

            _export('AjaxCtrl', AjaxCtrl = function (_MetricsPanelCtrl) {
                _inherits(AjaxCtrl, _MetricsPanelCtrl);

                // constructor($scope, $injector, private templateSrv, private $sce) {
                function AjaxCtrl($scope, $injector, templateSrv, $sce, $http) {
                    _classCallCheck(this, AjaxCtrl);

                    var _this = _possibleConstructorReturn(this, (AjaxCtrl.__proto__ || Object.getPrototypeOf(AjaxCtrl)).call(this, $scope, $injector));

                    _this.$sce = $sce;
                    _this.$http = $http;
                    _this.templateSrv = templateSrv;

                    _.defaults(_this.panel, panelDefaults);
                    _.defaults(_this.panel.timeSettings, panelDefaults.timeSettings);

                    _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
                    _this.events.on('panel-initialized', _this.onPanelInitalized.bind(_this));
                    _this.events.on('refresh', _this.onRefresh.bind(_this));
                    _this.events.on('render', _this.onRender.bind(_this));
                    //this.events.on('parseParam', this.onParseParam.bind(this));
                    return _this;
                }

                // This just skips trying to send the actual query.  perhaps there is a better way


                _createClass(AjaxCtrl, [{
                    key: 'issueQueries',
                    value: function issueQueries(datasource) {
                        this.updateTimeRange();

                        console.log('block issueQueries', datasource);
                    }
                }, {
                    key: 'onPanelInitalized',
                    value: function onPanelInitalized() {
                        this.updateFN();
                    }
                }, {
                    key: 'onInitEditMode',
                    value: function onInitEditMode() {
                        this.editorTabs.splice(1, 1); // remove the 'Metrics Tab'
                        this.addEditorTab('Options', 'public/plugins/' + this.pluginId + '/editor.html', 1);
                        this.editorTabIndex = 1;

                        this.updateFN();
                    }
                }, {
                    key: 'onPanelTeardown',
                    value: function onPanelTeardown() {
                        // this.$timeout.cancel(this.nextTickPromise);
                    }
                }, {
                    key: 'updateFN',
                    value: function updateFN() {
                        this.params_fn = null;
                        this.display_fn = null;

                        if (this.panel.params_js) {
                            try {
                                this.params_fn = new Function('ctrl', 'return ' + this.panel.params_js);
                            } catch (ex) {
                                console.warn('error parsing params_js', this.panel.params_js, ex);
                                this.params_fn = null;
                            }
                        }

                        // NOTE, this is not exposed yet
                        if (this.panel.display_js) {
                            try {
                                this.display_fn = new Function('ctrl', 'response', this.panel.display_js);
                            } catch (ex) {
                                console.warn('error parsing display_js', this.panel.display_js, ex);
                                this.display_fn = null;
                            }
                        }

                        this.onRefresh();
                    }
                }, {
                    key: 'onParseParam',
                    value: function onParseParam(param, key) {
                        var that = this;
                        var paramStr = "";
                        if (param.constructor == String || param.constructor == Number || param.constructor == Boolean) {
                            paramStr += "&" + key + "=" + encodeURIComponent(param);
                        } else {
                            $.each(param, function (i) {
                                var k = key == null ? i : key + (param instanceof Array ? "[" + i + "]" : "." + i);
                                paramStr += '&' + that.onParseParam(this, k);
                            });
                        }
                        return paramStr.substr(1);
                    }
                }, {
                    key: 'onRefresh',
                    value: function onRefresh() {
                        //console.log('refresh', this);
                        this.updateTimeRange(); // needed for the first call

                        var that = this;
                        var params;
                        if (this.params_fn) {
                            params = this.params_fn(this);
                        }

                        var data, pageInfo, num, pageSize;
                        var totalPage = 0,
                            pageIndex = 1;

                        function goPage(pno, psize) {
                            var paramsData = {
                                'method.name': 'mash5.task.queryFeeds',
                                'method.optimize': 'fetchOne',
                                'query.bo._id': '4f8d24b8632a848bd909b577@TGZ.Bo',
                                'user.sessionId': '-5108224830335736294594b863fa7b11b00010bd76e',
                                'page.curPage': pno,
                                // 'query.bo.Fields.1.Value[]': '故障上报',
                                //'query.bo.Fields.1.Value': '自动上报',
                                'condition.$or': JSON.stringify([{ "bo.Fields.7.Value": "等待审核" }, { "bo.Fields.7.Value": "上报人已确认" }, { "bo.Fields.7.Value": "完成", "bo.Fields.11.Value.id": "57fcaf794dec600d30ae0bd1@0.User" }, { "bo.Fields.7.Value": "已批待完成", "bo.Fields.10.Value.id": "57fcaf794dec600d30ae0bd1@0.User" }, { "bo.Fields.7.Value": "因故搁置", "bo.Fields.10.Value.id": "57fcaf794dec600d30ae0bd1@0.User" }])
                            };
                            that.$http({
                                method: that.panel.method,
                                url: that.panel.url,
                                headers: {
                                    'Content-Type': "application/x-www-form-urlencoded; charset=UTF-8"
                                },
                                data: that.onParseParam(paramsData)
                            }).then(function successCallback(response) {
                                var html = response.data.object;

                                data = html.nextData;
                                pageInfo = html.pageInfo;
                                num = pageInfo.total; //表格所有行数(所有记录数)  
                                pageSize = pageInfo.perPageSize; //每页显示行数  

                                //总共分几页   
                                if (num / pageSize > parseInt(num / pageSize)) {
                                    totalPage = parseInt(num / pageSize) + 1;
                                } else {
                                    totalPage = parseInt(num / pageSize);
                                }

                                var startPage = Math.max(pageIndex - 3, 1);
                                var endPage = Math.max(pageSize, startPage + 9);

                                if (endPage > totalPage) {
                                    endPage = totalPage + 1;
                                }
                                var pageStr = $('<ul></ul>');
                                for (var j = startPage; j < endPage; j++) {
                                    var activeClass = j === pageIndex ? 'active' : '';
                                    var liStr = $('<li><a class="table-panel-page-link pointer ' + activeClass + '">' + j + '</a></li>');
                                    pageStr.append(liStr);
                                }
                                $('#table-page').empty().append(pageStr);

                                that.updateContent(html.nextData);
                                // that.onRender(html);
                            }, function errorCallback(response) {
                                console.warn('error', response);
                                var body = '<h1>Error</h1><pre>' + JSON.stringify(response, null, " ") + "</pre>";
                                that.updateContent(body);
                            });
                        }

                        goPage(pageIndex, pageSize);
                        $('#table-page').bind('click', 'li', function (e) {
                            var el = $(e.target);
                            pageIndex = parseInt(el.text());
                            goPage(pageIndex, pageSize);
                        });
                    }
                }, {
                    key: 'onRender',
                    value: function onRender(html) {
                        var that = this;
                        var data = html.nextData;
                        var pageInfo = html.pageInfo;
                        var num = pageInfo.total; //表格所有行数(所有记录数)  

                        var pageSize = pageInfo.perPageSize; //每页显示行数  
                        var totalPage = 0;
                        var pageIndex = 1;

                        // //总共分几页   
                        // if (num / pageSize > parseInt(num / pageSize)) {
                        //     totalPage = parseInt(num / pageSize) + 1;
                        // } else {
                        //     totalPage = parseInt(num / pageSize);
                        // }
                        // var pageStr = $('<ul></ul>');
                        // for (var j = 1; j <= totalPage; j++) {
                        //     //   var activeClass = j === pageIndex ? 'active' : '';
                        //     var liStr = $('<li><a class="table-panel-page-link pointer">' + j + '</a></li>');
                        //     pageStr.append(liStr);
                        // }
                        // $('#table-page').empty().append(pageStr);
                    }
                }, {
                    key: 'updateContent',
                    value: function updateContent(html) {
                        try {
                            this.content = html;
                        } catch (e) {
                            console.log('Text panel error: ', e);
                            this.content = JSON.stringify(html);
                        }
                    }
                }]);

                return AjaxCtrl;
            }(MetricsPanelCtrl));

            _export('AjaxCtrl', AjaxCtrl);

            AjaxCtrl.templateUrl = 'module.html';
        }
    };
});
//# sourceMappingURL=ajax_ctrl.js.map
